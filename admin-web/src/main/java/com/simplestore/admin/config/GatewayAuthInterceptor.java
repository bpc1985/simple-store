package com.simplestore.admin.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.IOException;

@Component
public class GatewayAuthInterceptor implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
                                        ClientHttpRequestExecution execution) throws IOException {
        String accessToken = getAccessTokenFromSession();
        if (accessToken != null && !accessToken.isBlank()) {
            request.getHeaders().setBearerAuth(accessToken);
        }
        return execution.execute(request, body);
    }

    private String getAccessTokenFromSession() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
            HttpServletRequest httpRequest = attrs.getRequest();
            HttpSession session = httpRequest.getSession(false);
            if (session != null) {
                return (String) session.getAttribute("accessToken");
            }
        } catch (IllegalStateException ignored) {
            // No request context available (e.g., background thread)
        }
        return null;
    }
}
