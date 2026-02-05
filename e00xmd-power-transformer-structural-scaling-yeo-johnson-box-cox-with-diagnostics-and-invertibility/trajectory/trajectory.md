# Trajectory: Power Transformer Structural Scaling

This document records the implementation, design decisions, and testing strategy for the Power Transformer.

## Theoretical Background

Power transformers stabilize variance and normalize distributions to meet the assumptions of statistical models like linear regression.

### 1. Box-Cox Transformation
Designed for strictly positive data ($y > 0$).
$$y^{(\lambda)} = \begin{cases} \frac{y^\lambda - 1}{\lambda} & \lambda \neq 0 \\ \ln(y) & \lambda = 0 \end{cases}$$
*Continuous at $\lambda = 0$ but cannot handle zero or negative values.*

### 2. Yeo–Johnson Transformation
An extension supporting negative values and zeros, essential for centered or real-valued features.
$$y^{(\lambda)} = \begin{cases} ((y + 1)^\lambda - 1) / \lambda & \lambda \neq 0, y \geq 0 \\ \ln(y + 1) & \lambda = 0, y \geq 0 \\ -((-y + 1)^{2-\lambda} - 1) / (2 - \lambda) & \lambda \neq 2, y < 0 \\ -\ln(-y + 1) & \lambda = 2, y < 0 \end{cases}$$

### 3. Diagnostics & Invertibility
*   **Optimal $\lambda$**: Typically found via Maximum Likelihood Estimation (MLE).
*   **Tools**: Q-Q Plots for visual check and Shapiro-Wilk for statistical verification.
*   **Invertibility**: Both are strictly monotonic, allowing predictions to be mapped back to the original scale (e.g., dollars, kilograms).

| Feature | Box-Cox | Yeo-Johnson |
| :--- | :--- | :--- |
| **Input Domain** | Strictly Positive ($y > 0$) | All Real Numbers |
| **Handling Zeros** | No (requires shift) | Yes |
| **Invertibility** | Yes | Yes |

## Implementation Details (`repository_after/__init__.py`)

The core implementation focused on providing a robust interface for power transformations (Yeo-Johnson and Box-Cox) coupled with statistical diagnostics.

### 1. Power Transformation (`fit_transform_power`)
- **Robust Validation**: 
    - Input is checked for empty arrays, `NaN`, and `±inf` values, raising `ValueError` as required.
    - Shape handling ensures only 1D or `(n, 1)` column vectors are accepted, with consistent flattening to `(n,)` output.
- **Method-Specific Logic**:
    - **Box-Cox**: Validates strictly positive data. In case of failure, the error message dynamically includes the minimum value found (e.g., `ValueError: ... Minimum value found: -2.5`).
    - **Yeo-Johnson**: Native support for positive, negative, and zero values.
- **Engine**: Uses `sklearn.preprocessing.PowerTransformer(standardize=False)` [1] to perform the mathematical transformations.
- **Returns**: A tuple of `(transformed_array, fitted_transformer)`. The transformer supports `inverse_transform`.

### 2. Diagnostics (`normality_report`)
- **Metrics**: Computes Skewness and Fisher Kurtosis using `scipy.stats` [2].
- **Adaptive P-Value**: 
    - Uses `scipy.stats.normaltest` [3] (D'Agostino's K² test) for datasets with $n \ge 8$.
    - Falls back to `scipy.stats.shapiro` [4] for smaller datasets to maintain statistical validity.

### 3. Improvement Decision (`improved_normality`)
- **Criteria**: Returns `True` if and only if both the absolute skewness **and** absolute kurtosis of the "after" dataset are lower than the "before" dataset.
- **Output**: Returns a boolean and a comprehensive metrics dictionary.

## Testing Strategy (`tests/test_power_transformer.py`)

A comprehensive suite of 14 tests was developed using `pytest` to verify all constraints in the README:

- **Validation Tests**: Verified that empty arrays, non-finite values, and incorrect dimensions (e.g., 2D matrices) are rejected.
- **Consistency Tests**: Confirmed that `(n, 1)` and `(n,)` inputs yield identical results.
- **Box-Cox Edge Cases**: Specifically tested the requirement that non-positive values yield a `ValueError` containing the minimum value found.
- **Invertibility**: Verified that the returned transformer can accurately revert the data back to its original state within a tolerance of $1 \times 10^{-5}$.
- **Performance/Type Checks**: Ensured outputs are always `float` and of finite values.

## Replication Steps

### 1. Environment Setup
Install the necessary dependencies:
```bash
pip install numpy scipy scikit-learn pytest
```

### 2. Running Tests
To run the specialized test suite:
```bash
# Add the repository to PYTHONPATH and run pytest
export PYTHONPATH=$PYTHONPATH:$(pwd)/repository_after
python -m pytest tests/test_power_transformer.py
```

### 3. Running Evaluation
To generate the final evaluation report:
```bash
python evaluation/evaluation.py
```

## Summary of Completed Tasks
- [x] Designed comprehensive test cases for all README requirements.
- [x] Implemented Box-Cox and Yeo-Johnson transformation logic.
- [x] Integrated robust input validation and error reporting.
- [x] Built diagnostic reports with adaptive normality testing.
- [x] Verified implementation against test suite and evaluation scripts.

## References

The implementation of these transformations and diagnostic tools is based on established statistical methods and industry-standard libraries:

1.  **Scikit-learn `PowerTransformer` Documentation**: Detailed documentation of the Yeo-Johnson and Box-Cox implementations used as the core transformation engine. [Publicly Accessible Here](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.PowerTransformer.html)

2.  **SciPy `stats.skew` & `stats.kurtosis` Documentation**: Documentation for the underlying skewness and kurtosis calculations (Fisher's definition). [Skewness](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.skew.html) | [Kurtosis](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kurtosis.html)

3.  **SciPy `stats.normaltest` Documentation**: Public documentation for D'Agostino and Pearson's $K^2$ test. [Publicly Accessible Here](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.normaltest.html)

4.  **SciPy `stats.shapiro` Documentation**: Public documentation for the Shapiro-Wilk test used for smaller sample sizes. [Publicly Accessible Here](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.shapiro.html)

