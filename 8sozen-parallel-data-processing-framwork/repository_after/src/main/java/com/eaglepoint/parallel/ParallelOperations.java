package com.eaglepoint.parallel;

import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;
import java.util.stream.Collectors;

/**
 * Utility class providing pre-built parallel operations using Fork/Join framework.
 */
public class ParallelOperations {

    /**
     * Parallel map operation that transforms elements while preserving order.
     * Uses Fork/Join for parallel mapping and index-based result placement.
     *
     * @param data   the input list
     * @param mapper the transformation function
     * @param <T>    input type
     * @param <R>    result type
     * @return list of transformed elements in the same order
     */
    public static <T, R> List<R> parallelMap(List<T> data, Function<T, R> mapper) {
        return parallelMap(data, mapper, ForkJoinPool.commonPool());
    }

    public static <T, R> List<R> parallelMap(List<T> data, Function<T, R> mapper, ForkJoinPool pool) {
        if (data == null || data.isEmpty()) return new ArrayList<>();
        
        R[] results = (R[]) new Object[data.size()];
        
        pool.invoke(new RecursiveAction() {
            private final int threshold = Math.max(data.size() / (Runtime.getRuntime().availableProcessors() * 4), 100);
            
            @Override
            protected void compute() {
                computeRange(0, data.size());
            }
            
            private void computeRange(int start, int end) {
                if (end - start <= threshold) {
                    for (int i = start; i < end; i++) {
                        results[i] = mapper.apply(data.get(i));
                    }
                } else {
                    int mid = (start + end) / 2;
                    invokeAll(
                        new RecursiveAction() {
                            @Override
                            protected void compute() {
                                computeRange(start, mid);
                            }
                        },
                        new RecursiveAction() {
                            @Override
                            protected void compute() {
                                computeRange(mid, end);
                            }
                        }
                    );
                }
            }
        });
        
        return Arrays.asList(results);
    }

    /**
     * Parallel filter operation maintaining relative order of elements.
     *
     * @param data      the input list
     * @param predicate the filter predicate
     * @param <T>       element type
     * @return list containing only matching elements
     */
    public static <T> List<T> parallelFilter(List<T> data, Predicate<T> predicate) {
        return parallelFilter(data, predicate, ForkJoinPool.commonPool());
    }

    public static <T> List<T> parallelFilter(List<T> data, Predicate<T> predicate, ForkJoinPool pool) {
        if (data == null || data.isEmpty()) return new ArrayList<>();
        
        return pool.invoke(new RecursiveTask<List<T>>() {
            private final int threshold = Math.max(data.size() / (Runtime.getRuntime().availableProcessors() * 4), 100);
            
            @Override
            protected List<T> compute() {
                return computeRange(0, data.size());
            }
            
            private List<T> computeRange(int start, int end) {
                if (end - start <= threshold) {
                    List<T> result = new ArrayList<>();
                    for (int i = start; i < end; i++) {
                        T element = data.get(i);
                        if (predicate.test(element)) {
                            result.add(element);
                        }
                    }
                    return result;
                } else {
                    int mid = (start + end) / 2;
                    
                    RecursiveTask<List<T>> leftTask = new RecursiveTask<List<T>>() {
                        @Override protected List<T> compute() { return computeRange(start, mid); }
                    };
                    RecursiveTask<List<T>> rightTask = new RecursiveTask<List<T>>() {
                        @Override protected List<T> compute() { return computeRange(mid, end); }
                    };
                    
                    invokeAll(leftTask, rightTask);
                    
                    List<T> leftResult = leftTask.join();
                    List<T> rightResult = rightTask.join();
                    
                    List<T> combined = new ArrayList<>(leftResult.size() + rightResult.size());
                    combined.addAll(leftResult);
                    combined.addAll(rightResult);
                    return combined;
                }
            }
        });
    }

    /**
     * Parallel merge sort implementation.
     *
     * @param data       the list to sort
     * @param comparator the comparison function
     * @param <T>        element type
     * @return sorted list
     */
    public static <T> List<T> parallelSort(List<T> data, Comparator<T> comparator) {
        return parallelSort(data, comparator, ForkJoinPool.commonPool());
    }

    public static <T> List<T> parallelSort(List<T> data, Comparator<T> comparator, ForkJoinPool pool) {
        if (data == null || data.isEmpty()) return new ArrayList<>();
        if (data.size() == 1) return new ArrayList<>(data);
        
        List<T> mutableCopy = new ArrayList<>(data);
        
        return pool.invoke(new RecursiveTask<List<T>>() {
            private final int threshold = Math.max(data.size() / (Runtime.getRuntime().availableProcessors() * 2), 1000);
            
            @Override
            protected List<T> compute() {
                return mergeSort(mutableCopy);
            }
            
            private List<T> mergeSort(List<T> list) {
                if (list.size() <= threshold) {
                    List<T> sorted = new ArrayList<>(list);
                    sorted.sort(comparator);
                    return sorted;
                }
                
                int mid = list.size() / 2;
                List<T> left = list.subList(0, mid);
                List<T> right = list.subList(mid, list.size());
                
                RecursiveTask<List<T>> leftTask = new RecursiveTask<List<T>>() {
                    @Override protected List<T> compute() { return mergeSort(left); }
                };
                RecursiveTask<List<T>> rightTask = new RecursiveTask<List<T>>() {
                    @Override protected List<T> compute() { return mergeSort(right); }
                };
                
                invokeAll(leftTask, rightTask);
                
                List<T> leftSorted = leftTask.join();
                List<T> rightSorted = rightTask.join();
                
                return merge(leftSorted, rightSorted, comparator);
            }
            
            private List<T> merge(List<T> left, List<T> right, Comparator<T> comp) {
                List<T> result = new ArrayList<>(left.size() + right.size());
                int i = 0, j = 0;
                
                while (i < left.size() && j < right.size()) {
                    if (comp.compare(left.get(i), right.get(j)) <= 0) {
                        result.add(left.get(i++));
                    } else {
                        result.add(right.get(j++));
                    }
                }
                
                while (i < left.size()) result.add(left.get(i++));
                while (j < right.size()) result.add(right.get(j++));
                
                return result;
            }
        });
    }

    /**
     * Parallel reduction using Fork/Join pattern.
     *
     * @param data        the input list
     * @param identity    the identity value
     * @param accumulator the binary operator
     * @param <T>         element type
     * @return reduced result
     */
    public static <T> T parallelReduce(List<T> data, T identity, BinaryOperator<T> accumulator) {
        return parallelReduce(data, identity, accumulator, ForkJoinPool.commonPool());
    }

    public static <T> T parallelReduce(List<T> data, T identity, BinaryOperator<T> accumulator, ForkJoinPool pool) {
        if (data == null || data.isEmpty()) return identity;
        
        return pool.invoke(new RecursiveTask<T>() {
            private final int threshold = Math.max(data.size() / (Runtime.getRuntime().availableProcessors() * 4), 100);
            
            @Override
            protected T compute() {
                return computeRange(0, data.size());
            }
            
            private T computeRange(int start, int end) {
                if (end - start <= threshold) {
                    T result = identity;
                    for (int i = start; i < end; i++) {
                        result = accumulator.apply(result, data.get(i));
                    }
                    return result;
                } else {
                    int mid = (start + end) / 2;
                    
                    RecursiveTask<T> leftTask = new RecursiveTask<T>() {
                        @Override protected T compute() { return computeRange(start, mid); }
                    };
                    RecursiveTask<T> rightTask = new RecursiveTask<T>() {
                        @Override protected T compute() { return computeRange(mid, end); }
                    };
                    
                    invokeAll(leftTask, rightTask);
                    
                    return accumulator.apply(leftTask.join(), rightTask.join());
                }
            }
        });
    }

    /**
     * Execute action on all elements in parallel without collecting results.
     *
     * @param data   the input list
     * @param action the action to perform
     * @param <T>    element type
     */
    public static <T> void parallelForEach(List<T> data, Consumer<T> action) {
        parallelForEach(data, action, ForkJoinPool.commonPool());
    }

    public static <T> void parallelForEach(List<T> data, Consumer<T> action, ForkJoinPool pool) {
        if (data == null || data.isEmpty()) return;
        
        pool.invoke(new RecursiveAction() {
            private final int threshold = Math.max(data.size() / (Runtime.getRuntime().availableProcessors() * 4), 100);
            
            @Override
            protected void compute() {
                computeRange(0, data.size());
            }
            
            private void computeRange(int start, int end) {
                if (end - start <= threshold) {
                    for (int i = start; i < end; i++) {
                        action.accept(data.get(i));
                    }
                } else {
                    int mid = (start + end) / 2;
                    invokeAll(
                        new RecursiveAction() {
                            @Override
                            protected void compute() {
                                computeRange(start, mid);
                            }
                        },
                        new RecursiveAction() {
                            @Override
                            protected void compute() {
                                computeRange(mid, end);
                            }
                        }
                    );
                }
            }
        });
    }

    /**
     * Find any element matching the predicate with short-circuit evaluation.
     *
     * @param data      the input list
     * @param predicate the search predicate
     * @param <T>       element type
     * @return Optional containing first match found, or empty
     */
    public static <T> Optional<T> parallelFindAny(List<T> data, Predicate<T> predicate) {
        return parallelFindAny(data, predicate, ForkJoinPool.commonPool());
    }

    public static <T> Optional<T> parallelFindAny(List<T> data, Predicate<T> predicate, ForkJoinPool pool) {
        if (data == null || data.isEmpty()) return Optional.empty();
        
        CancellationToken cancellation = new CancellationToken();
        
        try {
            T result = pool.invoke(new RecursiveTask<T>() {
                private final int threshold = Math.max(data.size() / (Runtime.getRuntime().availableProcessors() * 4), 100);
                
                @Override
                protected T compute() {
                    return computeRange(0, data.size());
                }
                
                private T computeRange(int start, int end) {
                    if (cancellation.isCancelled()) return null;
                    
                    if (end - start <= threshold) {
                        for (int i = start; i < end; i++) {
                            if (cancellation.isCancelled()) return null;
                            T element = data.get(i);
                            if (predicate.test(element)) {
                                cancellation.cancel(); // Signal other tasks to stop
                                return element;
                            }
                        }
                        return null;
                    } else {
                        int mid = (start + end) / 2;
                        
                        RecursiveTask<T> leftTask = new RecursiveTask<T>() {
                            @Override protected T compute() { return computeRange(start, mid); }
                        };
                        RecursiveTask<T> rightTask = new RecursiveTask<T>() {
                            @Override protected T compute() { return computeRange(mid, end); }
                        };
                        
                        invokeAll(leftTask, rightTask);
                        
                        T rightResult = rightTask.join();
                        if (rightResult != null) {
                            cancellation.cancel();
                            return rightResult;
                        }
                        
                        return leftTask.join();
                    }
                }
            });
            
            return Optional.ofNullable(result);
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
