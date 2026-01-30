import numpy as np
from scipy import stats
from sklearn.preprocessing import PowerTransformer

def fit_transform_power(array, method="yeo-johnson"):
    """
    Fits a power transformer to the data and returns the transformed array and the fitted transformer.
    """
    # Input validation
    if not isinstance(array, np.ndarray):
        array = np.array(array)
    
    if array.size == 0:
        raise ValueError("Input array is empty.")
    
    if not np.all(np.isfinite(array)):
        raise ValueError("Input array contains NaN or inf values.")
    
    # Shape validation
    # Reject non-1D arrays except (n, 1) column vectors.
    # ndim == 1 is OK. ndim == 2 with shape[1] == 1 is OK.
    # ndim == 0 (scalar), ndim == 2 with shape[1] != 1, or ndim > 2 are NOT OK.
    if not (array.ndim == 1 or (array.ndim == 2 and array.shape[1] == 1)):
        raise ValueError("Input must be a 1D array or an (n, 1) column vector.")
    
    # Consistent flattening to (n,)
    array_flat = array.flatten()
    
    if method not in ["yeo-johnson", "box-cox"]:
        raise ValueError(f"Unsupported method: {method}. Supported methods are 'yeo-johnson' and 'box-cox'.")
    
    if method == "box-cox":
        min_val = np.min(array_flat)
        if min_val <= 0:
            raise ValueError(f"Box-Cox transformation requires strictly positive values. Minimum value found: {min_val}")
    
    # sklearn's PowerTransformer expects (n_samples, n_features)
    pt = PowerTransformer(method=method, standardize=False)
    transformed = pt.fit_transform(array_flat.reshape(-1, 1)).flatten()
    
    return transformed.astype(float), pt

def normality_report(array):
    """
    Computes skewness, kurtosis (Fisher), and a normality test result with a p-value.
    """
    if not isinstance(array, np.ndarray):
        array = np.array(array)
        
    skewness = stats.skew(array)
    kurtosis = stats.kurtosis(array, fisher=True)
    
    # Use normaltest or shapiro depending on sample size
    # normaltest requires at least 8 samples
    if len(array) >= 8:
        _, p_value = stats.normaltest(array)
    else:
        # fallback to shapiro for small samples
        _, p_value = stats.shapiro(array)
        
    return {
        "skewness": float(skewness),
        "kurtosis": float(kurtosis),
        "p_value": float(p_value)
    }

def improved_normality(before, after):
    """
    Returns (bool, metrics) using measurable criteria:
    |skew| decreases and |kurtosis| decreases.
    """
    metrics_before = normality_report(before)
    metrics_after = normality_report(after)
    
    skew_improved = abs(metrics_after["skewness"]) < abs(metrics_before["skewness"])
    kurt_improved = abs(metrics_after["kurtosis"]) < abs(metrics_before["kurtosis"])
    p_not_worsened = metrics_after["p_value"] >= metrics_before["p_value"]
    
    # Requirement: at minimum |skew| and |kurt| decrease.
    # Optionally: p-value does not worsen.
    improved = skew_improved and kurt_improved and p_not_worsened
    
    return improved, {
        "before": metrics_before,
        "after": metrics_after
    }
