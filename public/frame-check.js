(() => {
  "use strict";

  const DURATION_MS = 5000;
  const SAMPLE_LIMIT = 512;
  const PROGRESS_INTERVAL_MS = 250;
  const byId = (id) => document.getElementById(id);
  const page = byId("frame-check");
  const startButton = byId("frame-start");
  const copyButton = byId("frame-copy");
  const status = byId("frame-status");
  const progress = byId("frame-progress");
  const progressText = byId("frame-progress-text");
  const resultSection = byId("frame-result");
  const resultJson = byId("frame-result-json");
  const copyStatus = byId("frame-copy-status");
  const metricIds = [
    "frame-rate",
    "frame-duration",
    "frame-callbacks",
    "frame-mean",
    "frame-max",
    "frame-median",
    "frame-p95",
  ];
  const samples = new Float64Array(SAMPLE_LIMIT);
  let running = false;
  let rafId = null;
  let firstTimestamp = null;
  let previousTimestamp = null;
  let callbackCount = 0;
  let maxInterval = 0;
  let lastProgress = 0;
  let result = null;

  const round = (value) => Number(value.toFixed(3));

  function clearResult() {
    result = null;
    resultSection.hidden = true;
    resultJson.hidden = true;
    resultJson.textContent = "";
    copyStatus.textContent = "";
    copyButton.disabled = true;
    samples.fill(0);
    for (const id of metricIds) byId(id).textContent = "—";
  }

  function abort(message) {
    running = false;
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    rafId = null;
    firstTimestamp = null;
    previousTimestamp = null;
    callbackCount = 0;
    maxInterval = 0;
    lastProgress = 0;
    clearResult();
    progress.value = 0;
    progressText.textContent = "0.0 / 5.0 秒";
    page.dataset.state = "aborted";
    startButton.disabled = false;
    startButton.textContent = "重新测试 5 秒";
    status.textContent = message;
  }

  function complete(elapsed) {
    running = false;
    rafId = null;
    const sampleCount = Math.min(callbackCount, SAMPLE_LIMIT);
    const sorted = samples.slice(0, sampleCount).sort();
    const middle = Math.floor(sampleCount / 2);
    const median =
      sampleCount % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2;
    // Only measurement numbers are retained/copied: no environment identifiers.
    result = {
      schemaVersion: 1,
      targetDurationMs: DURATION_MS,
      elapsedMs: round(elapsed),
      callbackCount,
      callbacksPerSecond: round((callbackCount * 1000) / elapsed),
      meanIntervalMs: round(elapsed / callbackCount),
      maxIntervalMs: round(maxInterval),
      sampleCount,
      sampleLimit: SAMPLE_LIMIT,
      sampleMedianIntervalMs: round(median),
      sampleP95IntervalMs: round(sorted[Math.ceil(sampleCount * 0.95) - 1]),
    };
    byId("frame-rate").textContent = result.callbacksPerSecond.toFixed(1);
    byId("frame-duration").textContent = (result.elapsedMs / 1000).toFixed(3);
    byId("frame-callbacks").textContent = String(result.callbackCount);
    byId("frame-mean").textContent = result.meanIntervalMs.toFixed(2);
    byId("frame-max").textContent = result.maxIntervalMs.toFixed(2);
    byId("frame-median").textContent = result.sampleMedianIntervalMs.toFixed(2);
    byId("frame-p95").textContent = result.sampleP95IntervalMs.toFixed(2);
    resultJson.textContent = JSON.stringify(result, null, 2);
    resultSection.hidden = false;
    copyButton.disabled = false;
    progress.value = DURATION_MS;
    progressText.textContent = "5.0 / 5.0 秒";
    page.dataset.state = "complete";
    startButton.disabled = false;
    startButton.textContent = "重新测试 5 秒";
    status.textContent =
      result.maxIntervalMs > 250
        ? `测量完成：平均 ${result.callbacksPerSecond.toFixed(1)} 浏览器回调 次/秒。本次存在长调度停顿，不能代表稳定刷新节奏；请保持窗口前台、避免遮挡后重测。`
        : `测量完成：平均 ${result.callbacksPerSecond.toFixed(1)} 浏览器回调 次/秒。可复制结果或重新测试。`;
  }

  function onFrame(timestamp) {
    rafId = null;
    if (!running) return;
    if (document.visibilityState !== "visible") {
      abort("测量已中止：页面进入后台，读数已清空。请保持本页可见后重新测试。");
      return;
    }
    if (
      !Number.isFinite(timestamp) ||
      (previousTimestamp !== null && timestamp <= previousTimestamp)
    ) {
      abort("测量已中止：回调时间无效，读数已清空。请重新测试。");
      return;
    }
    if (firstTimestamp === null) {
      firstTimestamp = timestamp;
      previousTimestamp = timestamp;
    } else {
      const interval = timestamp - previousTimestamp;
      previousTimestamp = timestamp;
      samples[callbackCount % SAMPLE_LIMIT] = interval;
      callbackCount++;
      maxInterval = Math.max(maxInterval, interval);
      const elapsed = timestamp - firstTimestamp;
      if (elapsed >= DURATION_MS) {
        complete(elapsed);
        return;
      }
      // Sparse DOM writes keep this reference page's own rendering load small.
      if (elapsed - lastProgress >= PROGRESS_INTERVAL_MS) {
        lastProgress = elapsed;
        progress.value = elapsed;
        progressText.textContent = `${(elapsed / 1000).toFixed(1)} / 5.0 秒`;
      }
    }
    rafId = window.requestAnimationFrame(onFrame);
  }

  startButton.addEventListener("click", () => {
    if (running) return;
    if (document.visibilityState !== "visible") {
      abort("请保持本页在前台可见后重新测试。");
      return;
    }
    clearResult();
    firstTimestamp = null;
    previousTimestamp = null;
    callbackCount = 0;
    maxInterval = 0;
    lastProgress = 0;
    progress.value = 0;
    progressText.textContent = "0.0 / 5.0 秒";
    running = true;
    page.dataset.state = "running";
    startButton.disabled = true;
    status.textContent = "正在测量原生回调，请保持本页可见，等待 5 秒。";
    rafId = window.requestAnimationFrame(onFrame);
  });

  copyButton.addEventListener("click", async () => {
    if (!result || running) return;
    const copiedResult = result;
    copyButton.disabled = true;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(copiedResult, null, 2),
      );
      if (result === copiedResult)
        copyStatus.textContent = "已复制 JSON 测量结果。";
    } catch {
      if (result === copiedResult) {
        resultJson.hidden = false;
        copyStatus.textContent =
          "浏览器未允许写入剪贴板，请从下方手动复制 JSON 结果。";
      }
    } finally {
      if (result === copiedResult) copyButton.disabled = false;
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (running && document.visibilityState !== "visible") {
      abort("测量已中止：页面进入后台，读数已清空。请保持本页可见后重新测试。");
    }
  });
  window.addEventListener("pagehide", () => {
    if (running)
      abort("测量已中止：页面已离开，读数已清空。返回后请重新测试。");
  });

  if (
    typeof window.requestAnimationFrame === "function" &&
    typeof window.cancelAnimationFrame === "function"
  ) {
    startButton.disabled = false;
  } else {
    page.dataset.state = "unsupported";
    status.textContent =
      "当前环境不支持原生 requestAnimationFrame，无法测量。请使用支持此功能的浏览器。";
  }
})();
