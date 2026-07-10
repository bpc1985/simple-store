package com.simplestore.common.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PagedResult<T> implements Serializable {
    private static final long serialVersionUID = 1L;

    private List<T> items;
    private int page;
    private int pageSize;
    private long totalCount;
}

