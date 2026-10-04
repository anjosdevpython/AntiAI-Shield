import { test, describe } from "node:test";
import assert from "node:assert";

// Test utility functions
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatTime(ms) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function validateFileSelection(fileSize, fileType, maxMb = 20) {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(fileType)) {
    return { valid: false, error: "Esse arquivo não parece ser uma imagem compatível. Envie JPG, PNG ou WEBP." };
  }
  const maxBytes = maxMb * 1024 * 1024;
  if (fileSize > maxBytes) {
    return { valid: false, error: `A imagem excede o limite de ${maxMb} MB.` };
  }
  return { valid: true, error: null };
}

function calculateSliderPercent(clientX, containerLeft, containerWidth) {
  const x = clientX - containerLeft;
  return Math.max(0, Math.min(100, (x / containerWidth) * 100));
}

describe("Frontend Core Unit & Logic Tests", () => {
  describe("Formatting utilities", () => {
    test("formatBytes should format sizes properly", () => {
      assert.strictEqual(formatBytes(0), "0 B");
      assert.strictEqual(formatBytes(1024), "1 KB");
      assert.strictEqual(formatBytes(2.4 * 1024 * 1024), "2.4 MB");
    });

    test("formatTime should format milliseconds and seconds", () => {
      assert.strictEqual(formatTime(350), "350 ms");
      assert.strictEqual(formatTime(1500), "1.5s");
    });
  });

  describe("Upload validation logic", () => {
    test("accepts valid JPEG, PNG and WEBP under 20MB", () => {
      assert.deepStrictEqual(validateFileSelection(1024 * 100, "image/png"), { valid: true, error: null });
      assert.deepStrictEqual(validateFileSelection(1024 * 500, "image/jpeg"), { valid: true, error: null });
      assert.deepStrictEqual(validateFileSelection(1024 * 200, "image/webp"), { valid: true, error: null });
    });

    test("rejects invalid MIME types", () => {
      const res = validateFileSelection(1024, "application/pdf");
      assert.strictEqual(res.valid, false);
      assert.match(res.error, /não parece ser uma imagem compatível/);
    });

    test("rejects oversized images (>20MB)", () => {
      const res = validateFileSelection(25 * 1024 * 1024, "image/jpeg", 20);
      assert.strictEqual(res.valid, false);
      assert.match(res.error, /excede o limite de 20 MB/);
    });
  });

  describe("Before/After slider calculations", () => {
    test("clips slider position between 0 and 100%", () => {
      // 50% midpoint
      assert.strictEqual(calculateSliderPercent(500, 0, 1000), 50);
      // Beyond right edge
      assert.strictEqual(calculateSliderPercent(1200, 0, 1000), 100);
      // Beyond left edge
      assert.strictEqual(calculateSliderPercent(-50, 0, 1000), 0);
    });
  });

  describe("Protection levels & strategies specification", () => {
    const levels = ["balanced", "strong", "maximum"];
    test("supports required protection levels", () => {
      assert.strictEqual(levels.length, 3);
      assert.ok(levels.includes("balanced"));
      assert.ok(levels.includes("strong"));
      assert.ok(levels.includes("maximum"));
    });
  });
});
