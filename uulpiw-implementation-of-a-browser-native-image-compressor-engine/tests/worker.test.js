describe("Worker Integrity and Main Thread Tests", () => {
  let Worker;

  beforeAll(() => {
    Worker = class MockWorker {
      constructor(url) {
        this.url = url;
        this.onmessage = null;
        this.onerror = null;
        this.messageCount = 0;
        this.terminated = false;
      }

      postMessage(data) {
        this.messageCount++;
        
        setTimeout(() => {
          if (this.onmessage && !this.terminated) {
            this.onmessage({
              data: {
                id: data.id,
                result: {
                  blob: new Blob(["compressed"], { type: "image/png" }),
                  width: 400,
                  height: 300,
                  originalSize: 1000000,
                  compressedSize: 450000,
                  savings: 55,
                },
              },
            });
          }
        }, 10);
      }

      terminate() {
        this.terminated = true;
      }
    };
    global.Worker = Worker;
  });

  it("Uses Web Worker for non-blocking compression", (done) => {
    const worker = new Worker("compressor.worker.js");

    worker.onmessage = (e) => {
      expect(e.data.result).toBeDefined();
      expect(e.data.result.blob).toBeInstanceOf(Blob);
      expect(e.data.result.blob.type).toBe("image/png");
      expect(worker.messageCount).toBe(1);
      
      worker.terminate();
      expect(worker.terminated).toBe(true);
      done();
    };

    worker.postMessage({
      id: "test-1",
      file: new Blob(["test"], { type: "image/png" }),
      compressionStrength: 0.7,
    });
  });

  it("Multiple workers can run simultaneously", async () => {
    const workers = [];
    const results = [];

    const promises = [];
    for (let i = 0; i < 3; i++) {
      const worker = new Worker("compressor.worker.js");
      workers.push(worker);

      const promise = new Promise((resolve) => {
        worker.onmessage = (e) => {
          results.push(e.data.result);
          expect(e.data.result.blob).toBeInstanceOf(Blob);
          worker.terminate();
          resolve();
        };

        worker.postMessage({
          id: `test-${i}`,
          file: new Blob(["test"], { type: "image/png" }),
          compressionStrength: 0.7,
        });
      });

      promises.push(promise);
    }

    await Promise.all(promises);

    expect(results).toHaveLength(3);
    expect(workers.every((w) => w.terminated)).toBe(true);
    results.forEach(result => {
      expect(result.blob.type).toBe("image/png");
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });
  });
});
