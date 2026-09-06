# Bundled DMN Runner

This module is the only component that imports Drools/KIE APIs. It exposes a token-protected, loopback-only HTTP endpoint for local DMN evaluation.

Release builds compile this Maven module, copy its complete dependency closure to `dist/lib`, add the compiled runner JAR, and create `dist/runtime` with `jlink`. Electron Builder copies that entire directory into every application installer through `extraResources`. Builds require an OpenJDK 17 distribution under GPLv2 with Classpath Exception; Eclipse Temurin is recommended. This license allows redistribution of the generated private runtime. End users therefore do not download Drools/Kogito dependencies and do not need a system Java installation.

The runner must reject external Java functions, non-empty DMN extension elements, external data sources and network access. Only standard local DMN/FEEL evaluation is allowed. Empty `extensionElements` placeholders emitted by the Kogito editor are accepted and have no execution effect. The runner excludes XStream's unused MXParser implementation from its runtime closure.
