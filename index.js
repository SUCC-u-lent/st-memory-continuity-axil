import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";
import { isOnline, sendRequest } from "./auxil_pipeline.js"

const extensionName = "st-memory-continuity-axil";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {
  url: "http://localhost:3000"
};

function getUrl()
{
  return extension_settings[extensionName]["url"] || "http://localhost:3000"
}

async function loadSettings() {
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  $("#mca_url").val( getUrl() )
}

function onURLInput(val)
{
  extension_settings[extensionName]["url"] = val.value
  saveSettingsDebounced()
}

async function onConnectTest()
{
  const result = await isOnline();
  if (result)
    toastr.info(
      `Successfully Connected to auxil on url: ${extension_settings[extensionName]["url"]}!`,
      "Connection Established"
    )
  else
    toastr.error(
      `Failed to connect to auxil on url: ${extension_settings[extensionName]["url"]}, please install Auxil and start it or change the url`,
      "Connection Failed"
    )
}

async function onSendSample()
{
  const response = await sendRequest("qwen3:1.7b", "Create a haiku about cheese", 0.7)
  console.log(response.response)
  toastr.info(
    "Cheese Haiku: " + response.response,
    "Response Recieved"
  )
}

eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (data)=>{
  console.log(data)
})

jQuery(async () => {
  const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
  $("#extensions_settings").append(settingsHtml);
  $("#mca_url").on("input", onURLInput)
  $("#mca_connect").on("click", onConnectTest)
  $("#mca_send_sample").on("click", onSendSample)
  // Actual code stuff

  // At end
  loadSettings();
});
