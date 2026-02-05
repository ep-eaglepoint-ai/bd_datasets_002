
import numpy as np

from repository_after import fit_transform_power, normality_report, improved_normality

def main():
    print("=== Synthetic Skewed Dataset Demo ===")
    
    # 1. Generate Synthetic Skewed Data (Log-Normal)
    np.random.seed(42)
    # Mean of underlying normal distribution = 0, sigma = 1
    # This generates a right-skewed distribution
    data = np.random.lognormal(mean=0, sigma=1, size=1000)
    
    print(f"\nGenerated {len(data)} samples from a Log-Normal distribution.")
    
    # 2. Initial Normality Report
    report_orig = normality_report(data)
    print("\n[Original Data Diagnostics]")
    print(f"Skewness: {report_orig['skewness']:.4f}")
    print(f"Kurtosis: {report_orig['kurtosis']:.4f}")
    print(f"P-value (Normality Test): {report_orig['p_value']:.4e}")
    
    # 3. Apply Yeo-Johnson
    print("\n--- Applying Yeo-Johnson Transformation ---")
    data_yj, _ = fit_transform_power(data, method="yeo-johnson")
    improved_yj, metrics_yj = improved_normality(data, data_yj)
    
    print(f"Skewness: {metrics_yj['after']['skewness']:.4f}")
    print(f"Kurtosis: {metrics_yj['after']['kurtosis']:.4f}")
    print(f"P-value: {metrics_yj['after']['p_value']:.4e}")
    print(f"Improved? {improved_yj} (Criteria: |skew| and |kurtosis| reduced)")

    # 4. Apply Box-Cox (valid since data > 0)
    print("\n--- Applying Box-Cox Transformation ---")
    if np.min(data) > 0:
        data_bc, _ = fit_transform_power(data, method="box-cox")
        improved_bc, metrics_bc = improved_normality(data, data_bc)
        
        print(f"Skewness: {metrics_bc['after']['skewness']:.4f}")
        print(f"Kurtosis: {metrics_bc['after']['kurtosis']:.4f}")
        print(f"P-value: {metrics_bc['after']['p_value']:.4e}")
        print(f"Improved? {improved_bc}")
    else:
        print("Skipping Box-Cox: Data must be strictly positive.")

    # 5. Summary
    print("\n=== Demo Complete ===")
    print("The transformed data should show skewness and kurtosis closer to 0.")

if __name__ == "__main__":
    main()
