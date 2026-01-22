using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading;

namespace CsvLib
{
    public class CsvParserOptions
    {
        public char Delimiter { get; set; } = ',';
        public char QuoteChar { get; set; } = '"';
        public bool HasHeaderRow { get; set; } = false;
        public bool TrimFields { get; set; } = false;
    }

    public class CsvParser : IDisposable
    {
        private readonly CsvParserOptions _options;
        private bool _disposed = false;

        public CsvParser() : this(new CsvParserOptions()) { }

        public CsvParser(CsvParserOptions options)
        {
            _options = options ?? new CsvParserOptions();
        }

        public CsvParserOptions Options => _options;

        public IEnumerable<string[]> Parse(string csvContent)
        {
            if (string.IsNullOrEmpty(csvContent))
                yield break;

            var lines = csvContent.Split('\n');

            foreach (var line in lines)
            {
                if (string.IsNullOrEmpty(line))
                    continue;

                var fields = line.TrimEnd('\r').Split(_options.Delimiter);

                for (int i = 0; i < fields.Length; i++)
                {
                    var field = fields[i];
                    
                    if (field.StartsWith(_options.QuoteChar.ToString()) && 
                        field.EndsWith(_options.QuoteChar.ToString()) && 
                        field.Length >= 2)
                    {
                        fields[i] = field.Substring(1, field.Length - 2);
                    }

                    if (_options.TrimFields)
                    {
                        fields[i] = fields[i].Trim();
                    }
                }

                yield return fields;
            }
        }

        public async IAsyncEnumerable<string[]> ParseAsync(
            Stream stream, 
            [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
        {
            using var reader = new StreamReader(stream);
            var content = await reader.ReadToEndAsync();

            foreach (var row in Parse(content))
            {
                ct.ThrowIfCancellationRequested();
                yield return row;
            }
        }

        public IEnumerable<string[]> ParseFile(string filePath)
        {
            var content = File.ReadAllText(filePath);
            return Parse(content);
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _disposed = true;
            }
        }
    }
}

