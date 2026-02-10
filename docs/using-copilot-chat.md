# Using Copilot Chat

Copilot Chat is an integrated AI assistant powered by `@github/copilot-sdk`. Use it to have conversations and create agents.

## Open Chat

Click **Copilot Chat** in the Navigator. Chat loads in Main View and the right pane switches to Conversations.

## Send a Message

Type in the input box at the bottom of Main View and press `Enter`. Responses stream in real time.

## Pick a Model

Click the model picker above the input box to choose which Copilot model to use. The selected model applies to the current conversation.

## Create Agents from Chat

Chat can create agents that work in your repositories. Just include a directory path:

> Create an agent for ~/src/my-project and review the code

See [Working with Agents](working-with-agents.md) for the full workflow.

## Manage Conversations

The right pane shows **Conversations** when in chat mode.

### Create a New Conversation

Click the **`+`** button in the Conversations header. A new conversation starts with a clean context.

### Switch Between Conversations

Click any conversation in the list. Main View loads that conversation's messages. Each conversation has its own isolated AI context.

### Rename a Conversation

Right-click a conversation and select **Rename**, or double-click the title. Conversations are auto-named from the first message, but you can rename them to anything.

### Delete a Conversation

Right-click a conversation and select **Delete**. This removes it from disk permanently.

## Notes

- Conversations are saved to disk automatically and restored on restart
- The AI does **not** retain context from prior sessions — restored conversations show previous messages for reference, but the AI starts fresh
- On first use, authenticate with `/login` in the Copilot CLI
