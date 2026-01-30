import { ParsedRow } from '@/lib/schema';
import { formatErrorsForDisplay } from '@/lib/validation';

interface PreviewTableProps {
  rows: ParsedRow[];
  headers: string[];
}

export default function PreviewTable({ rows, headers }: PreviewTableProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="card" id="preview-table-container">
      <h2 className="card-title">👀 Preview (First 20 Rows)</h2>
      <div className="table-container">
        <table className="preview-table" id="preview-table">
          <thead>
            <tr>
              <th>Row #</th>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr 
                key={row.rowNumber} 
                className={row.isValid ? '' : 'error-row'}
                data-row-number={row.rowNumber}
                data-valid={row.isValid}
              >
                <td className="row-number">{row.rowNumber}</td>
                {headers.map((header) => (
                  <td key={header}>{row.data[header] || ''}</td>
                ))}
                <td>
                  {row.isValid ? (
                    <span className="status-badge ok">✓ OK</span>
                  ) : (
                    <div>
                      <span className="status-badge error">✗ Error</span>
                      {row.errors && (
                        <ul className="error-list">
                          {Object.entries(row.errors).map(([field, message]) => (
                            <li key={field}>
                              {field}: {message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
