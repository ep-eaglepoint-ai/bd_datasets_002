package com.eaglepoint.parallel;

import java.util.Iterator;

public interface DataSource<T> {
    long estimatedSize();
    Iterator<T> iterator();
    boolean supportsRandomAccess();
}
