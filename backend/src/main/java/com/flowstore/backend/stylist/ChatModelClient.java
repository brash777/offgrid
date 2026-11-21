package com.flowstore.backend.stylist;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Component
public class ChatModelClient {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);

    private final RestClient restClient;
    private final StylistProperties properties;

    public ChatModelClient(RestClient.Builder builder, StylistProperties properties) {
        this.properties = properties;
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build());
        requestFactory.setReadTimeout(properties.timeout());
        this.restClient = builder
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    public JsonNode complete(ArrayNode messages, ArrayNode tools, String requiredTool) {
        ObjectNode body = JsonNodeFactory.instance.objectNode();
        body.put("model", properties.model());
        body.set("messages", messages);
        body.set("tools", tools);
        if (requiredTool == null) {
            body.put("tool_choice", "auto");
        } else {
            body.putObject("tool_choice").put("type", "function").putObject("function").put("name", requiredTool);
        }

        JsonNode response = restClient.post()
                .uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
        JsonNode payload = response != null && response.isArray() ? response.path(0) : response;
        JsonNode message = payload == null ? null : payload.path("choices").path(0).path("message");
        if (message == null || !message.isObject()) {
            throw new IllegalStateException("The chat model returned no message");
        }
        return message;
    }
}
