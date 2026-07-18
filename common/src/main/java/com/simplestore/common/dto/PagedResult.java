package com.simplestore.common.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;
import java.util.function.Function;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PagedResult<T> implements Serializable {
    private static final long serialVersionUID = 1L;

    private List<T> items;
    private int page;
    private int pageSize;
    private long totalCount;

    public static <E, D> PagedResult<D> from(List<E> content, long totalElements, int page, int pageSize, Function<E, D> mapper) {
        PagedResult<D> result = new PagedResult<>();
        result.setItems(content.stream().map(mapper).toList());
        result.setPage(page);
        result.setPageSize(pageSize);
        result.setTotalCount(totalElements);
        return result;
    }
}

