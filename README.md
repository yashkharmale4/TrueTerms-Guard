# TrueTerms-Guard
# 🛡️ TrueTerms Guard - AI Cyber Defense Extension

**TrueTerms Guard** is a dual-core browser extension powered by **Google Gemini 2.5 Flash**. It protects users from "Click-Blindness" by analyzing legal agreements in seconds and defending against phishing attacks with real-time forensic scanning.

## 🚀 Key Features

* **⚖️ AI Legal Analyst:** Instantly summarizes Terms of Service and calculates a risk score (0-100).
* **🕵️‍♂️ Imposter Detector:** Compares Page Titles vs. URLs to catch "Pixel-Perfect" phishing clones.
* **📨 Form Tracker:** Analyzes HTML forms to reveal exactly where your password is being sent.
* **🔗 Auto-Link Hunter:** Automatically hunts for hidden "Terms" links in the DOM and fetches them in the background.
* **⚡ Powered by Gemini 2.5:** Utilizing Google's latest multimodal model for high-speed analysis.

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Backend Intelligence:** Google Gemini API (`gemini-2.5-flash`)
* **Platform:** Chrome Extension Manifest V3
* **Tools:** Chrome Scripting API, DOM Parser

## 📦 Installation

1.  Clone this repository:
    ```bash
    git clone [https://github.com/YOUR_USERNAME/TrueTerms-Guard.git](https://github.com/YOUR_USERNAME/TrueTerms-Guard.git)
    ```
2.  Open Chrome/Edge and go to `chrome://extensions`.
3.  Enable **"Developer Mode"** (top right toggle).
4.  Click **"Load Unpacked"** and select the folder.
5.  **Important:** Open `popup.js` and add your Gemini API Key in line 2.

## 📸 Screenshots

![Legal Scan](screenshot1.png)
*Legal Scan Mode detecting risky clauses*

![Site Safety](screenshot2.png)
*Forensic Dashboard analyzing site security*

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
