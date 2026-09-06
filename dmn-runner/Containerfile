# Build dependencies are resolved only while the image is built. The final image
# contains the local runner and its complete Drools/KIE dependency closure.
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN mvn -B package && cp target/dmn-runner-*.jar dist/lib/

FROM eclipse-temurin:17-jre
WORKDIR /opt/dmn-runner
COPY --from=build /workspace/dist/lib ./lib
ENV BPM_MODELER_DMN_ORIGIN=http://127.0.0.1:5173
EXPOSE 8787
# Set DMN_RUNNER_TOKEN to a secret at container start. Bind the published port
# to 127.0.0.1 when the runner is intended for local browser development.
ENTRYPOINT ["/bin/sh", "-c", "exec java --add-modules jdk.httpserver -cp 'lib/*' de.bpmmodeler.dmnrunner.Main --host 0.0.0.0 --port ${DMN_RUNNER_PORT:-8787} --token ${DMN_RUNNER_TOKEN:?DMN_RUNNER_TOKEN must be set}"]
