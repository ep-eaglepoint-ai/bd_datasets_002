self.onmessage = function (e) {
  const { text, filename } = e.data

  try {
    const data = JSON.parse(text)
    self.postMessage({ data, filename })
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) })
  }
}
