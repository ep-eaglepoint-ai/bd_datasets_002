interface SummaryDashboardProps {
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export default function SummaryDashboard({ totalRows, validRows, invalidRows }: SummaryDashboardProps) {
  return (
    <div className="card" id="summary-dashboard">
      <h2 className="card-title">📊 Summary</h2>
      <div className="summary-grid">
        <div className="summary-item total">
          <span className="summary-value" id="total-rows">{totalRows}</span>
          <span className="summary-label">Total Rows</span>
        </div>
        <div className="summary-item valid">
          <span className="summary-value" id="valid-rows">{validRows}</span>
          <span className="summary-label">Valid Rows</span>
        </div>
        <div className="summary-item invalid">
          <span className="summary-value" id="invalid-rows">{invalidRows}</span>
          <span className="summary-label">Invalid Rows</span>
        </div>
      </div>
    </div>
  );
}
