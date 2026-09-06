package de.bpmmodeler.dmnrunner;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.kie.api.KieServices;
import org.kie.api.builder.KieBuilder;
import org.kie.api.builder.KieFileSystem;
import org.kie.api.builder.Message;
import org.kie.api.builder.Results;
import org.kie.api.io.ResourceType;
import org.kie.api.runtime.KieContainer;
import org.kie.api.runtime.KieRuntimeFactory;
import org.kie.dmn.api.core.DMNContext;
import org.kie.dmn.api.core.DMNDecisionResult;
import org.kie.dmn.api.core.DMNMessage;
import org.kie.dmn.api.core.DMNModel;
import org.kie.dmn.api.core.DMNResult;
import org.kie.dmn.api.core.DMNRuntime;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Single-purpose local adapter for standard DMN/FEEL evaluation. It exposes no
 * extension classpath, Java functions or network interface to the renderer.
 */
public final class Main {
  private static final ObjectMapper JSON = new ObjectMapper();

  private Main() { }

  public static void main(String[] arguments) throws Exception {
    String host = option(arguments, "--host", "127.0.0.1");
    int port = option(arguments, "--port", 0);
    String token = option(arguments, "--token", null);
    if (token == null || token.isBlank()) throw new IllegalArgumentException("--token must be configured.");
    // Local desktop execution uses the default loopback address. Docker may
    // explicitly opt into a container interface and remains responsible for
    // restricting publication of that port.
    HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getByName(host), port), 0);
    server.createContext("/api/dmn/evaluate", exchange -> evaluateRequest(exchange, token));
    server.start();
    JSON.writeValue(System.out, Map.of("ready", true, "port", server.getAddress().getPort()));
  }

  private static void evaluateRequest(HttpExchange exchange, String token) throws IOException {
    // Request logging distinguishes connection and CORS failures from DMN errors.
    System.err.printf("DMN runner request: %s %s%n", exchange.getRequestMethod(), exchange.getRequestURI());
    allowConfiguredOrigin(exchange);
    exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "POST, OPTIONS");
    if ("OPTIONS".equals(exchange.getRequestMethod())) { exchange.sendResponseHeaders(204, -1); return; }
    if (!"POST".equals(exchange.getRequestMethod())) { exchange.sendResponseHeaders(405, -1); return; }
    if (!("Bearer " + token).equals(exchange.getRequestHeaders().getFirst("Authorization"))) { exchange.sendResponseHeaders(401, -1); return; }
    try {
      Map<String, Object> request = JSON.readValue(exchange.getRequestBody(), new TypeReference<>() { });
      Evaluation evaluation = evaluateRequest(request);
      respond(exchange, 200, Map.of("decisions", evaluation.decisions, "messages", evaluation.messages));
    } catch (Exception error) {
      // The localized error key is intended for the user interface. The local
      // diagnostic is retained for the modeler and is also written to container logs.
      error.printStackTrace(System.err);
      respond(exchange, 400, Map.of("error", "dmnTests.error.executionFailed", "details", String.valueOf(error.getMessage())));
    }
  }

  private static void allowConfiguredOrigin(HttpExchange exchange) {
    // Vite commonly serves either localhost or 127.0.0.1. Both are loopback
    // origins; deployments can add a controlled origin through the environment.
    String requestOrigin = exchange.getRequestHeaders().getFirst("Origin");
    Set<String> allowed = new HashSet<>(Set.of("http://127.0.0.1:5173", "http://localhost:5173"));
    String configured = System.getenv("BPM_MODELER_DMN_ORIGIN");
    if (configured != null) allowed.addAll(Arrays.asList(configured.split(",")));
    if (requestOrigin != null && allowed.contains(requestOrigin)) {
      exchange.getResponseHeaders().set("Access-Control-Allow-Origin", requestOrigin);
      exchange.getResponseHeaders().set("Vary", "Origin");
    }
  }

  private static void respond(HttpExchange exchange, int status, Map<String, ?> body) throws IOException {
    byte[] response = JSON.writeValueAsBytes(body);
    exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
    exchange.sendResponseHeaders(status, response.length);
    exchange.getResponseBody().write(response); exchange.close();
  }

  private static Evaluation evaluateRequest(Map<String, Object> request) {
    String dmnXml = requiredString(request, "dmnXml");
    Map<String, Object> inputs = map(request.get("inputs"), "inputs");
    rejectUnsafeExtensions(dmnXml);
    return evaluate(dmnXml, inputs);
  }

  private static int option(String[] arguments, String name, int fallback) {
    String value = option(arguments, name, String.valueOf(fallback));
    try { return Integer.parseInt(value); } catch (NumberFormatException error) { throw new IllegalArgumentException(name + " must be a number."); }
  }

  private static String option(String[] arguments, String name, String fallback) {
    for (int index = 0; index + 1 < arguments.length; index++) if (name.equals(arguments[index])) return arguments[index + 1];
    return fallback;
  }

  private static Evaluation evaluate(String dmnXml, Map<String, Object> inputs) {
    KieServices services = KieServices.Factory.get();
    KieFileSystem files = services.newKieFileSystem();
    files.write(services.getResources().newByteArrayResource(dmnXml.getBytes()).setResourceType(ResourceType.DMN).setSourcePath("src/main/resources/model.dmn"));
    KieBuilder builder = services.newKieBuilder(files).buildAll();
    Results buildResults = builder.getResults();
    if (buildResults.hasMessages(Message.Level.ERROR)) throw new IllegalArgumentException(buildResults.getMessages().toString());
    KieContainer container = services.newKieContainer(services.getRepository().getDefaultReleaseId());
    DMNRuntime runtime = KieRuntimeFactory.of(container.getKieBase()).get(DMNRuntime.class);
    List<DMNModel> models = runtime.getModels();
    if (models.size() != 1) throw new IllegalArgumentException("The DMN runner requires exactly one DMN model.");
    DMNContext context = runtime.newContext();
    inputs.forEach(context::set);
    DMNResult result = runtime.evaluateAll(models.get(0), context);
    // Preserve one result per DMN decision. A list keeps the complete decision
    // graph observable, including IDs and execution status for every node.
    List<Map<String, Object>> decisions = new ArrayList<>();
    result.getDecisionResults().forEach(decision -> decisions.add(decisionResult(decision)));
    List<Map<String, String>> messages = result.getMessages().stream().map(message -> Map.of(
      "severity", message.getSeverity() == DMNMessage.Severity.ERROR ? "error" : "warning",
      "message", message.getMessage())).toList();
    return new Evaluation(decisions, messages);
  }

  // DMN extension elements may bind arbitrary Java behavior. The desktop runner
  // deliberately accepts only self-contained standard DMN/FEEL models.
  private static void rejectUnsafeExtensions(String dmnXml) {
    // Kogito writes empty, namespace-prefixed extensionElements placeholders.
    // Remove only those placeholders before checking for an actual extension so
    // legitimate editor metadata stays compatible without allowing a bypass by
    // changing the namespace prefix.
    String withoutEmptyExtensionElements = dmnXml.replaceAll("(?is)<(?:[\\w.-]+:)?extensionElements\\b[^>]*/\\s*>", "");
    if (dmnXml.toLowerCase().contains("java:") || dmnXml.toLowerCase().contains("javax:")
      || withoutEmptyExtensionElements.matches("(?is).*<(?:[\\w.-]+:)?extensionElements\\b.*")) {
      throw new IllegalArgumentException("Java functions and DMN extension elements are not allowed in local test execution.");
    }
  }

  private static Map<String, Object> decisionResult(DMNDecisionResult decision) {
    // LinkedHashMap accepts null DMN values, unlike Map.of, and preserves the
    // fixed response property order for readable diagnostic JSON.
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", decision.getDecisionId()); result.put("name", decision.getDecisionName());
    result.put("value", decision.getResult()); result.put("status", decision.getEvaluationStatus().name());
    return result;
  }

  private static String requiredString(Map<String, Object> request, String property) {
    Object value = request.get(property);
    if (!(value instanceof String string) || string.isBlank()) throw new IllegalArgumentException(property + " must be a non-empty string.");
    return string;
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> map(Object value, String property) {
    if (!(value instanceof Map<?, ?> map)) throw new IllegalArgumentException(property + " must be an object.");
    return (Map<String, Object>) map;
  }

  private record Evaluation(List<Map<String, Object>> decisions, List<Map<String, String>> messages) { }
}
