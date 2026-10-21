const form = document.querySelector("form"),
  status = document.querySelector("#status"),
  button = document.querySelector("button");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  button.disabled = true;
  status.textContent = "正在连接…";
  try {
    const result = await window.clientSetup.connect(
      document.querySelector("#url").value,
    );
    if (!result.ok) status.textContent = result.error;
  } catch {
    status.textContent = "连接失败，请重试";
  } finally {
    button.disabled = false;
  }
});
