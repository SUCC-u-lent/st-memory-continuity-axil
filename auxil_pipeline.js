import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";

const extensionName = "st-memory-continuity-axil";
const extensionSettings = extension_settings[extensionName];
function getURL()
{
    return (extensionSettings["url"] || "http://localhost:3000") + "/api/"
}

function isOnline()
{
    return new Promise((resolve,reject)=>{
        $.ajax({
            url: getURL()+"models",
            method: "GET",
            contentType: "application/json",
            success: function(response)
            {
                resolve(true)
            },
            error: function(xhr, status, error)
            {
                reject(error)
            }
        })
    })
}

function getModels()
{
    return new Promise((resolve,reject)=>{
        const models = [] 
        $.get({
            url: getURL() + "models",
            method: "GET",
            contentType: "application/json",
            success: function(response)
            {
                resolve(response.models)
            },
            error: function(xhr, status, error)
            {
                reject(error)
            }
        })
    })
}

async function sendRequest(
    model = "qwen3:1.7b",
    prompt = "",
    temperature = 0.7
) {
    const response = await fetch(getURL() + "generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model,
            prompt: prompt,
            stream: false,
            options: {
                temperature: temperature
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Generate request failed: ${response.status}`);
    }

    const parentData = await response.json();

    return new Promise((resolve, reject) => {
        const poll = setInterval(async () => {
            try {
                const response = await fetch(
                    getURL() + "request/status/" + parentData.id
                );

                if (!response.ok) {
                    throw new Error(
                        `Status request failed: ${response.status}`
                    );
                }

                const data = await response.json();

                if (data.status === "fulfilled" || data.status === "stop") {
                    clearInterval(poll);

                    const resultResponse = await fetch(
                        getURL() + "request/result/" + parentData.id
                    );

                    if (!resultResponse.ok) {
                        throw new Error(
                            `Result request failed: ${resultResponse.status}`
                        );
                    }

                    const resultData = await resultResponse.json();

                    resolve(resultData.result);
                }

                if (data.status === "rejected") {
                    clearInterval(poll);

                    const resultResponse = await fetch(
                        getURL() + "request/result/" + parentData.id
                    );

                    if (!resultResponse.ok) {
                        throw new Error(
                            `Result request failed: ${resultResponse.status}`
                        );
                    }

                    const resultData = await resultResponse.json();

                    reject(resultData.result);
                }
            } catch (error) {
                clearInterval(poll);
                reject(error);
            }
        }, 1000);
    });
}

export {
    isOnline,
    getModels,
    sendRequest
}