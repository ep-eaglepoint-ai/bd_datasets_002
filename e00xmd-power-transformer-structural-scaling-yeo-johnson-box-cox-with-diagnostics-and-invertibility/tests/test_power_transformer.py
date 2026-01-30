import pytest
import numpy as np
from repository_after import fit_transform_power, normality_report, improved_normality

def test_fit_transform_power_empty_input():
    with pytest.raises(ValueError):
        fit_transform_power(np.array([]))

def test_fit_transform_power_nan_input():
    with pytest.raises(ValueError):
        fit_transform_power(np.array([1, 2, np.nan]))

def test_fit_transform_power_inf_input():
    with pytest.raises(ValueError):
        fit_transform_power(np.array([1, 2, np.inf]))
    with pytest.raises(ValueError):
        fit_transform_power(np.array([1, 2, -np.inf]))

def test_fit_transform_power_wrong_dimension():
    # 2D matrix (2, 2) should be rejected
    with pytest.raises(ValueError):
        fit_transform_power(np.array([[1, 2], [3, 4]]))

def test_fit_transform_power_column_vector():
    # (n, 1) column vector should be accepted and flattened
    data_1d = np.array([1, 2, 3, 4, 5])
    data_2d = data_1d.reshape(-1, 1)
    
    transformed_1d, _ = fit_transform_power(data_1d, method="yeo-johnson")
    transformed_2d, _ = fit_transform_power(data_2d, method="yeo-johnson")
    
    assert transformed_1d.shape == (5,)
    assert transformed_2d.shape == (5,)
    np.testing.assert_array_almost_equal(transformed_1d, transformed_2d)

def test_fit_transform_power_invalid_method():
    with pytest.raises(ValueError):
        fit_transform_power(np.array([1, 2, 3]), method="invalid-method")

def test_fit_transform_power_box_cox_non_positive():
    # Box-Cox requires strictly positive values
    with pytest.raises(ValueError) as excinfo:
        fit_transform_power(np.array([1, 0, 2]), method="box-cox")
    assert "0" in str(excinfo.value)
    
    with pytest.raises(ValueError) as excinfo:
        fit_transform_power(np.array([1, -5, 2]), method="box-cox")
    assert "-5" in str(excinfo.value)

def test_fit_transform_power_yeo_johnson_range():
    # Yeo-Johnson should handle negative, zero, and positive values
    data = np.array([-10, -1, 0, 1, 10])
    transformed, transformer = fit_transform_power(data, method="yeo-johnson")
    assert transformed.dtype == np.float64 or transformed.dtype == np.float32
    assert np.all(np.isfinite(transformed))
    assert transformed.shape == (5,)

def test_fit_transform_power_output_properties():
    data = np.array([1, 2, 3, 4, 5])
    for method in ["yeo-johnson", "box-cox"]:
        transformed, transformer = fit_transform_power(data, method=method)
        assert isinstance(transformed, np.ndarray)
        assert transformed.dtype.kind == 'f' # float
        assert transformed.shape == (5,)
        assert np.all(np.isfinite(transformed))

def test_normality_report():
    data = np.random.normal(0, 1, 100)
    report = normality_report(data)
    assert "skewness" in report
    assert "kurtosis" in report
    assert "p_value" in report
    assert isinstance(report["skewness"], float)
    assert isinstance(report["kurtosis"], float)
    assert isinstance(report["p_value"], float)

def test_improved_normality():
    # Case where normality is definitely improved
    # Log-normal data transformed by Box-Cox (which should make it more normal)
    np.random.seed(42)
    before = np.random.lognormal(0, 1, 100)
    
    # Simulate an "after" that is better (e.g. standard normal)
    after = np.random.normal(0, 1, 100)
    
    improved, metrics = improved_normality(before, after)
    
    assert isinstance(improved, bool)
    assert "before" in metrics
    assert "after" in metrics
    assert "skewness" in metrics["before"]
    assert "kurtosis" in metrics["before"]
    
    # If improved is True, it should satisfy the criteria in README:
    # "|skew| decreases and |kurtosis| decreases"
    if improved:
        assert abs(metrics["after"]["skewness"]) < abs(metrics["before"]["skewness"])
        assert abs(metrics["after"]["kurtosis"]) < abs(metrics["before"]["kurtosis"])

def test_improved_normality_criteria_check():
    # Mocking data to strictly test the criteria
    # Case 1: Both decrease
    before = np.array([1, 2, 10]) # Skewed
    after = np.array([1, 1.1, 1.2]) # Very flat, low skew
    
    improved, metrics = improved_normality(before, after)
    
    # Requirement: |skew| decreases and |kurtosis| decreases
    expected_improved = (abs(metrics["after"]["skewness"]) < abs(metrics["before"]["skewness"]) and 
                         abs(metrics["after"]["kurtosis"]) < abs(metrics["before"]["kurtosis"]))
    
    # Optional: p-value does not worsen (increase or stay same)
    # If the implementation includes this, we should be aware of it.
    # Since it's optional, the assertion depends on how it's implemented.
    # But usually, if improved is True, the above MUST be true.
    if improved:
        assert abs(metrics["after"]["skewness"]) < abs(metrics["before"]["skewness"])
        assert abs(metrics["after"]["kurtosis"]) < abs(metrics["before"]["kurtosis"])
        # Optionally: 
        if "p_value" in metrics["after"] and "p_value" in metrics["before"]:
            assert metrics["after"]["p_value"] >= metrics["before"]["p_value"]
    else:
        # If any of the mandatory criteria are not met, improved must be False
        assert not expected_improved or (
            # OR if optional p-value check is used and it worsened
            "p_value" in metrics["after"] and metrics["after"]["p_value"] < metrics["before"]["p_value"]
        )

def test_fit_transform_power_invertibility():
    # Test invertibility for both methods
    data = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    for method in ["yeo-johnson", "box-cox"]:
        transformed, transformer = fit_transform_power(data, method=method)
        # Assuming transformer follows sklearn API with inverse_transform
        # Requirement 14 says it returns (transformed_array, fitted_transformer)
        if hasattr(transformer, "inverse_transform"):
            inverted = transformer.inverse_transform(transformed.reshape(-1, 1)).flatten()
            np.testing.assert_allclose(data, inverted, rtol=1e-5)

def test_fit_transform_power_box_cox_min_value_in_error():
    # For method="box-cox", raise ValueError if any value ≤ 0, 
    # and the message must include the minimum value found.
    with pytest.raises(ValueError) as excinfo:
        fit_transform_power(np.array([1, 0.5, -2.5, 3]), method="box-cox")
    assert "-2.5" in str(excinfo.value)
    
    with pytest.raises(ValueError) as excinfo:
        fit_transform_power(np.array([1, 0, 3]), method="box-cox")
    assert "0" in str(excinfo.value)
