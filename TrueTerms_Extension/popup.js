// 1. PASTE YOUR API KEY HERE
const API_KEY = "AIzaSyCbFhmccvZ6EuOzj5b5gfk2nYpsyWe0iRY"; 

const tabTC = document.getElementById("tabTC");
const tabSite = document.getElementById("tabSite");
const viewTC = document.getElementById("viewTC");
const viewSite = document.getElementById("viewSite");

tabTC.addEventListener("click", () => switchTab("TC"));
tabSite.addEventListener("click", () => switchTab("SITE"));

function switchTab(mode) {
    if(mode === "TC") {
        tabTC.classList.add("active"); tabSite.classList.remove("active");
        viewTC.classList.add("active"); viewSite.classList.remove("active");
    } else {
        tabSite.classList.add("active"); tabTC.classList.remove("active");
        viewSite.classList.add("active"); viewTC.classList.remove("active");
    }
}

document.getElementById("btnScanTC").addEventListener("click", () => runScan("TC"));
document.getElementById("btnScanSite").addEventListener("click", () => runScan("SITE"));

async function runScan(mode) {
    const statusEl = document.getElementById(mode === "TC" ? "statusTC" : "statusSite");
    const btn = document.getElementById(mode === "TC" ? "btnScanTC" : "btnScanSite");
    
    statusEl.innerText = "Analyzing...";
    statusEl.style.color = "#94a3b8"; // Reset color
    btn.disabled = true;
    btn.style.opacity = "0.5";

    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // 1. GATHER EVIDENCE
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const links = Array.from(document.querySelectorAll("a"));
                const legalLink = links.find(a => a.href.includes("terms") || a.href.includes("legal") || a.href.includes("tos"));
                
                const forms = Array.from(document.forms).map(f => f.action).filter(a => a).join(", ") || "No forms/Self";
                
                const inputs = Array.from(document.querySelectorAll('input'))
                    .map(i => i.placeholder || i.name || i.type)
                    .filter(t => t && t !== "hidden" && t !== "submit")
                    .slice(0, 5).join(", ");

                return { 
                    text: document.body.innerText.substring(0, 2000), 
                    termUrl: legalLink ? legalLink.href : null,
                    inputs: inputs, 
                    formActions: forms, 
                    title: document.title, 
                    url: window.location.href,
                    origin: window.location.origin,
                    protocol: window.location.protocol 
                };
            }
        });

        if (!result || !result[0] || !result[0].result) {
            throw new Error("Cannot read page data. Try reloading the tab.");
        }

        const pageData = result[0].result;
        let textToAnalyze = pageData.text;

        // 2. BACKGROUND FETCH (T&C Mode Only)
        if (mode === "TC") {
            let target = pageData.termUrl;
            if (!target) {
                const guess = pageData.origin + "/terms";
                try { let r = await fetch(guess); if(r.ok) target = guess; } catch(e){}
            }
            if (target) {
                try {
                    let r = await fetch(target);
                    let html = await r.text();
                    let doc = new DOMParser().parseFromString(html, "text/html");
                    textToAnalyze = doc.body.innerText.substring(0, 20000);
                    statusEl.innerText = "Read hidden terms!";
                } catch(e){}
            }
        }

        // 3. GENERATE PROMPT
        let prompt = "";
        if (mode === "TC") {
            prompt = `Analyze this legal text. Return JSON: {"risk_score": "X/10", "risk_color": "green/orange/red", "hidden_clauses": ["Short point 1", "Short point 2"]} Text: ${textToAnalyze}`;
        } else {
            prompt = `
            You are a security tool. Analyze these forensic signals.
            1. URL: ${pageData.url} (Protocol: ${pageData.protocol})
            2. Title: "${pageData.title}" (Does this match the URL? Or is it an imposter?)
            3. Form Destinations: ${pageData.formActions}
            4. Inputs: ${pageData.inputs}
            5. Page Text: ${pageData.text}

            Return JSON ONLY: {
                "verdict": "SAFE" or "SUSPICIOUS" or "DANGEROUS",
                "verdict_color": "green/orange/red",
                "protocol_msg": "HTTPS (Secure)" or "HTTP (Unsafe)",
                "identity_msg": "Verified" or "Title Mismatch",
                "data_dest_msg": "Internal" or "External/Suspicious",
                "risk_tags": ["Login", "Credit Card", "Urgent Text"] (Max 4 tags)
            }`;
        }

        // 4. CALL GEMINI
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const data = await response.json();

        // --- ERROR CATCHER (This was missing!) ---
        if (!response.ok) {
            throw new Error(data.error?.message || "API Error: " + response.status);
        }

        const jsonString = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
        const json = JSON.parse(jsonString);

        // 5. UPDATE UI
        if (mode === "TC") {
            const banner = document.getElementById("tcBanner");
            banner.innerText = "RISK: " + json.risk_score;
            banner.style.backgroundColor = json.risk_color === "red" ? "#451a1a" : (json.risk_color === "green" ? "#14532d" : "#78350f");
            banner.style.color = json.risk_color === "red" ? "#fca5a5" : (json.risk_color === "green" ? "#86efac" : "#fcd34d");
            
            const list = document.getElementById("tcList");
            list.innerHTML = "";
            json.hidden_clauses.forEach(c => {
                let li = document.createElement("li"); li.innerText = c; list.appendChild(li);
            });
        } else {
            const v = document.getElementById("siteVerdict");
            v.innerText = json.verdict;
            v.style.backgroundColor = json.verdict_color === "red" ? "#ef4444" : (json.verdict_color === "green" ? "#22c55e" : "#f59e0b");
            v.style.color = json.verdict_color === "green" ? "#000" : "#fff";

            setCard("cardProto", "valProto", json.protocol_msg, json.protocol_msg.includes("Secure"));
            setCard("cardIdentity", "valIdentity", json.identity_msg, !json.identity_msg.includes("Mismatch"));
            setCard("cardDest", "valDest", json.data_dest_msg, !json.data_dest_msg.includes("Suspicious"));

            const tagBox = document.getElementById("riskTags");
            tagBox.innerHTML = "";
            json.risk_tags.forEach(t => {
                let s = document.createElement("span");
                s.className = "chip";
                if(t.toLowerCase().includes("login") || t.toLowerCase().includes("credit")) s.classList.add("risk");
                s.innerText = t;
                tagBox.appendChild(s);
            });
        }
        statusEl.innerText = "Done.";
        statusEl.style.color = "#22c55e"; // Green

    } catch (e) {
        console.error(e);
        statusEl.innerText = "Error: " + e.message;
        statusEl.style.color = "#ef4444"; // Red
    }
    btn.disabled = false;
    btn.style.opacity = "1";
}

function setCard(cardId, valId, text, isSafe) {
    document.getElementById(valId).innerText = text;
    const card = document.getElementById(cardId);
    if(isSafe) { card.classList.add("border-green"); card.classList.remove("border-red"); }
    else { card.classList.add("border-red"); card.classList.remove("border-green"); }
}