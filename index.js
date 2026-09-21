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
  let messages = [];

  const prompt = `
Extract important long-term memories from the messages.

Existing memories:
{{NOTES}}

Messages:
{{MESSAGES}}

Remember:
- Character facts
- Relationships
- Important events
- Decisions
- Goals
- Restrictions and limitations
- Consequences of past actions
- Important changes
- Facts that prevent future contradictions

Prioritize information that will matter later.

Do not remember:
- Casual dialogue
- Minor actions
- Descriptions
- Temporary details
- Unimportant information
- Existing memories
- Information not established by the messages

Return:
memories: an array of important new facts.
`;

  const batchSize = getCtxLength()

  const batchCount = Math.ceil(ctx.chat.length / batchSize);
  let batchNumber = 0;
  for (let i = 0; i < ctx.chat.length; i++)
  {
    const element = ctx.chat[i];

    if (element == undefined) continue;

    messages.push(
      element.name + ": " + element.mes
    );

    if (messages.length < batchSize) continue;
    batchNumber = batchNumber + 1;

    const requestPrompt = prompt
      .replace("{{NOTES}}", currentNotes)
      .replace("{{MESSAGES}}", messages.join("\n"));

    const result = await sendRequest(
      "qwen3:1.7b",
      requestPrompt,
      0.1
    );

    const data = JSON.parse(result.response);
    console.log(data)

    if (data.memories != undefined)
    {
      currentNotes += "\n" + data.memories.join("\n")
    }

    messages = [];
    console.log("Building Conversation, current batch:",batchNumber+"/"+batchCount,"\nCurrent Notes:",currentNotes)
  }
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
