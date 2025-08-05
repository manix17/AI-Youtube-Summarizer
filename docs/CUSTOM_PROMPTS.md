# Guide to Creating Custom Prompts

This guide explains how to customize the AI prompts in the AI YouTube Summarizer extension to tailor the summaries to your specific needs.

## The Basics of Prompts

The extension uses two main prompts to generate a summary:

1.  **System Prompt:** This sets the overall context and instructions for the AI. It defines the AI's role, the desired tone, and the general format of the output.
2.  **User Prompt:** This contains the specific request for the current video, including the video's transcript and other metadata.

By modifying these prompts, you can control the structure, style, and content of the summaries.

## Available Variables

You can use special variables in your prompts that the extension will automatically replace with the relevant video information.

*   `{VIDEO_TITLE}`: The full title of the YouTube video.
*   `{CHANNEL_NAME}`: The name of the YouTube channel.
*   `{VIDEO_DURATION}`: The duration of the video (e.g., "10:34").
*   `{VIDEO_TRANSCRIPT}`: The full, raw transcript of the video.
*   `{TARGET_LANGUAGE}`: The language you want the summary to be in (selected in the options).

## Example: Creating a "Technical Tutorial" Prompt

Let's say you want a prompt specifically for summarizing coding tutorials. You want the AI to focus on code snippets, libraries mentioned, and key technical steps.

**1. Create a New Profile:**
Go to the Options page and create a new profile named "Technical Tutorial". You can choose any AI provider (Google Gemini, OpenAI GPT, or Anthropic Claude) that works best for technical content.

**2. Modify the System Prompt:**

```
You are an expert technical analyst. Your task is to summarize programming tutorials from YouTube. Focus on extracting the core technical concepts, code examples, and actionable steps. The summary should be clear, concise, and aimed at a developer audience.
```

**3. Modify the User Prompt:**

```
Please provide a summary for the video titled "{VIDEO_TITLE}" from the channel "{CHANNEL_NAME}".

The video transcript is below:
---
{VIDEO_TRANSCRIPT}
---

Based on the transcript, please provide the following:

1.  **Main Goal:** A one-sentence description of what this tutorial teaches.
2.  **Key Libraries/Frameworks:** A list of the main technologies used.
3.  **Step-by-Step Summary:** A numbered list of the key steps shown in the tutorial.
4.  **Core Code Snippets:** Extract 1-2 essential code snippets that are critical to the tutorial.
5.  **Final Outcome:** Briefly describe the final result of following the tutorial.

The summary should be in {TARGET_LANGUAGE}.
```

**4. Save and Use:**
Save your settings. The extension will automatically store your custom prompts using an optimized storage system. Now, whenever you are on a technical tutorial, you can switch to the "Technical Tutorial" profile using the dropdown menu below any YouTube video to get summaries in this specific format.

**Note:** The extension uses an advanced storage architecture that stores your custom prompts separately from default ones, ensuring optimal performance and preventing Chrome storage quota issues.

## Principles for Good Prompts

*   **Be Specific:** The more specific your instructions, the better the result. Instead of "summarize the video," tell the AI *how* to summarize it.
*   **Define the Persona:** Telling the AI to act as an "expert technical analyst" or a "beginner-friendly teacher" changes the tone and focus of the summary.
*   **Use Formatting:** Use headings, bullet points, and numbered lists in your prompt to structure the desired output. The AI will often follow the format you provide.
*   **Test Different AI Providers:** Each AI provider (Gemini, OpenAI, Claude) has different strengths. Experiment to find which works best for your specific use case.
*   **Create Multiple Profiles:** Use the profile system to save different prompt configurations for different types of content (tutorials, podcasts, lectures, etc.).
*   **Experiment!** The best way to get the perfect prompt is to experiment. Try different phrasings, change the order of instructions, and see what works best for you.
