const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// Assuming services are running via docker-compose
// In docker, hostname is service name.
const API_URL = process.env.API_URL || "http://localhost:8080/api";

describe("Logistics Pipeline Requirements", () => {
  // Helper to upload
  const uploadFile = async (filename, content) => {
    const form = new FormData();
    form.append("file", Buffer.from(content), filename);
    try {
      const res = await axios.post(`${API_URL}/upload`, form, {
        headers: { ...form.getHeaders() },
      });
      return res.data;
    } catch (e) {
      return e.response ? e.response.data : { error: e.message };
    }
  };

  // Helper to poll status
  const pollStatus = async (batchId) => {
    for (let i = 0; i < 20; i++) {
      // 10 seconds timeout
      try {
        const res = await axios.get(`${API_URL}/status/${batchId}`);
        if (res.data.current_status === 4) return res.data; // Complete
        if (res.data.current_status === 5) throw new Error("Processing failed");
      } catch (e) {}
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error("Timeout");
  };

  test("Req 1 & 2: Upload CSV and receive Batch ID", async () => {
    const csv =
      "tracking_number,origin,destination,weight_kg,length_cm,width_cm,height_cm,ship_date,status\n" +
      "TN12345678,NYC,LAX,10.5,10,10,10,2023-01-01,pending";
    const res = await uploadFile("test.csv", csv);
    expect(res).toHaveProperty("batch_id");
    expect(res.batch_id).toMatch(/^[0-9a-f-]+$/); // UUID-like
  });

  test("Req 5 & 7: Validate records (Valid & Invalid)", async () => {
    const csv =
      "tracking_number,origin,destination,weight_kg,ship_date,status\n" +
      "VALID12345,NYC,LAX,5.0,2023-01-01,pending\n" + // Valid
      "INVALID,NYC,LAX,-5.0,2023-01-01,bad_status\n"; // Invalid weight & status
    const uploadRes = await uploadFile("validation.csv", csv);
    const batchId = uploadRes.batch_id;

    const status = await pollStatus(batchId);
    expect(status.valid_rows).toBe(1);
    expect(status.invalid_rows).toBe(1);
  });

  test("Req 3: CSV Parsing (Quotes & Newlines)", async () => {
    // "field with, comma","field with "" quote","field with \n newline"
    const csv =
      "tracking_number,origin,destination,weight_kg,ship_date,status\n" +
      'QT12345678,"New, York","Los ""Angeles""",10.0,2023-01-01,pending\n';
    const res = await uploadFile("quotes.csv", csv);
    const status = await pollStatus(res.batch_id);
    expect(status.valid_rows).toBe(1);
  });

  test("Req 15: Health Check", async () => {
    const res = await axios.get(`${API_URL}/health`);
    expect(res.status).toBe(200);
    expect(res.data.status).toBe("healthy");
  });
});
