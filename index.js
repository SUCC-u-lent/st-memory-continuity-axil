import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";
import { isOnline, sendRequest } from "./auxil_pipeline.js"
import { parseFlags } from "../../../macros/engine/MacroFlags.js";

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

function getCtxLength()
{
  return extension_settings[extensionName]["ctx_length"] || 3
}

async function loadSettings() {
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  $("#mca_url").val( getUrl() )
  $("#mca_ctx_length").val( extension_settings[extensionName]["ctx_length"] || 3 )
}

function onURLInput(val)
{
  extension_settings[extensionName]["url"] = val.value
  saveSettingsDebounced()
}

function onCtxLengthChange(val)
{
  try{
    extension_settings[extensionName]["ctx_length"] = parseFloat(val)
    saveSettingsDebounced()
  }catch(ignored){}
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

function getChatNotes()
{
  const ctx = getContext()
  if (ctx.chatId == undefined) return []
  const nts = extension_settings[extensionName]["chat_notes"] || {}
  return nts[ctx.chatId] || []
}
function saveChatNotes(notes){
  if (typeof notes != "object") return;
  const ctx = getContext()
  if (ctx.chatId == undefined) return []
  const nts = extension_settings[extensionName]["chat_notes"] || {}
  nts[ctx.chatId] = nts[ctx.chatId] || []
  extension_settings[extensionName]["chat_notes"][ctx.chatId] = notes
  saveSettingsDebounced()
}

eventSource.on(event_types.GENERATION_ENDED,(message_index)=>{
  const ctx = getContext()
  if (ctx == undefined || ctx.chat == undefined) return;
  const msg = ctx.chat[message_index]
  if (msg == undefined) return;

})

async function onComputeConversation()
{
  const ctx = getContext();

  if (ctx == undefined || ctx.chat == undefined) return;

  let currentNotes = getChatNotes() || "";
  let valArray = [];
  for (let i = 0; i < ctx.chat.length; i++)
  {
    const element = ctx.chat[i];

    if (element == undefined) continue;

    valArray.push(
      element.name + ": " + element.mes
    );

    // Exactly 3 messages
    if (valArray.length >= 3)
    {
      const conversation = valArray.join("\n");

      const prompt = `
      Extract important long-term memories from these 3 messages.

      Existing memories:
      ${currentNotes || "None"}

      Messages:
      ${conversation}

      Remember information that affects future story continuity, especially:
      - Character facts
      - Relationships
      - Important events
      - Decisions
      - Goals
      - Restrictions and limitations
      - Consequences of past actions
      - Important changes to characters or the situation

      Prioritize facts that should prevent future responses from contradicting what happened.

      Do not remember:
      - Casual dialogue
      - Minor actions
      - Descriptions
      - Temporary details
      - Unimportant information
      - Information already in existing memories
      - Information that was not established

      Return these fields:
      memories: an array of important new facts.
      `;
      currentNotes = await sendRequest(
        "qwen3:1.7b",
        prompt,
        0.2
      );

      console.log("Updated memory:", currentNotes);

      // Start the next group of 3
      valArray = [];
    }
  }

  // Process remaining messages if there are 1-2 left
  if (valArray.length > 0)
  {
    const conversation = valArray.join("\n");

    const prompt = `
    Extract important long-term memories from these 3 messages.

    Existing memories:
    ${currentNotes || "None"}

    Messages:
    ${conversation}

    Remember information that affects future story continuity, especially:
    - Character facts
    - Relationships
    - Important events
    - Decisions
    - Goals
    - Restrictions and limitations
    - Consequences of past actions
    - Important changes to characters or the situation

    Prioritize facts that should prevent future responses from contradicting what happened.

    Do not remember:
    - Casual dialogue
    - Minor actions
    - Descriptions
    - Temporary details
    - Unimportant information
    - Information already in existing memories
    - Information that was not established

    Return these fields:
    memories: an array of important new facts.
    `;
    currentNotes = await sendRequest(
      "qwen3:1.7b",
      prompt,
      0.2
    );

    console.log("Updated memory:", JSON.parse(currentNotes.response));
  }

  // Save currentNotes here
}

jQuery(async () => {
  const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
  $("#extensions_settings").append(settingsHtml);
  $("#mca_url").on("input", onURLInput)
  $("#mca_ctx_length").on("input", onCtxLengthChange)
  $("#mca_connect").on("click", onConnectTest)
  $("#mca_send_sample").on("click", onSendSample)
  $("#mca_compute_conversation").on("click", onComputeConversation)
  // Actual code stuff

  // At end
  loadSettings();
});
