import { action } from "@ember/object";
import { setOwner } from "@ember/owner";
import { withPluginApi } from "discourse/lib/plugin-api";

class OmitEmojiInit {
  constructor(owner, api) {
    setOwner(this, owner);

    const omittedEmojis = settings.omitted_emoji.split("|").filter(Boolean);
    const omittedEmojiGroups = settings.omitted_emoji_groups
      .split("|")
      .filter(Boolean);

    api.modifyClass(
      "component:emoji-picker/content",
      (Superclass) =>
        class extends Superclass {
          get groups() {
            const groups = super.groups;

            if (!omittedEmojiGroups.length && !omittedEmojis.length) {
              return groups;
            }

            const updatedGroups = Object.fromEntries(
              Object.entries(groups)
                .map(([key, emojis]) => {
                  if (
                    omittedEmojiGroups.length &&
                    omittedEmojiGroups.includes(key)
                  ) {
                    return null;
                  }
                  if (omittedEmojis.length) {
                    emojis = emojis.filter(
                      (emoji) => !omittedEmojis.includes(emoji.name)
                    );
                  }
                  return [key, emojis];
                })
                .filter(Boolean)
            );

            return updatedGroups;
          }

          get flatEmojis() {
            const list = super.flatEmojis;

            return omittedEmojis.length
              ? list.filter((emoji) => !omittedEmojis.includes(emoji.name))
              : list;
          }
        }
    );

    api.modifyClass(
      "component:d-editor",
      (Superclass) =>
        class extends Superclass {
          @action
          setupEditor(textManipulation) {
            const originalCleanup = super.setupEditor(textManipulation);
            const textareaWrapper = document.querySelector(
              ".d-editor-textarea-wrapper"
            );

            if (!textareaWrapper || !omittedEmojis.length) {
              return originalCleanup;
            }

            const childListObserver = new MutationObserver((mutationsList) => {
              mutationsList.forEach((mutation) => {
                const node = mutation.addedNodes[0];
                if (
                  node?.classList?.contains("autocomplete") &&
                  node?.classList?.contains("ac-emoji")
                ) {
                  omittedEmojis.forEach((emojiCode) => {
                    const emojiElement = node.querySelector(
                      `img.emoji[src*="${emojiCode}.png"]`
                    );

                    if (emojiElement) {
                      emojiElement.parentNode.parentNode.style.display = "none";
                    }
                  });
                }
              });
            });

            childListObserver.observe(textareaWrapper, {
              childList: true,
            });

            return () => {
              originalCleanup?.();
              childListObserver?.disconnect();
            };
          }
        }
    );
  }
}

export default {
  name: "discourse-omit-emoji",

  initialize(owner) {
    withPluginApi("0.35.0", (api) => {
      this.instance = new OmitEmojiInit(owner, api);
    });
  },

  tearDown() {
    this.instance = null;
  },
};
