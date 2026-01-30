import CSVUploader from '@/components/CSVUploader';

export default function Home() {
  return (
    <main className="container">
      <header className="header">
        <h1>📊 Bulk Import Tool</h1>
        <p>Upload a CSV file to validate and import your data</p>
      </header>
      <CSVUploader />
    </main>
  );
}
