package com.simplestore.storefront.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

/**
 * Adds {@code authenticated} attribute to every Thymeleaf model
 * so the layout template can toggle Login/Logout nav items.
 */
@Component
public class AuthStatusInterceptor implements HandlerInterceptor {

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response,
                           Object handler, ModelAndView modelAndView) {
        if (modelAndView != null) {
            HttpSession session = request.getSession(false);
            boolean authenticated = session != null
                    && session.getAttribute("accessToken") != null;
            modelAndView.addObject("authenticated", authenticated);
        }
    }
}
