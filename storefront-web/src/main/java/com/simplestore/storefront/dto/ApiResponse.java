package com.simplestore.storefront.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Mirrors com.simplestore.common.dto.ApiResponse from the common module.
 * Web apps can't depend on common directly, so we replicate the wrapper here.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;

    public ApiResponse() {}

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public T getData() { return data; }
    public void setData(T data) { this.data = data; }
}
