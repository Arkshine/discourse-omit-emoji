import { setOwner } from "@ember/owner";
import { later, schedule } from "@ember/runloop";
import { withPluginApi } from "discourse/lib/plugin-api";
import { observes, on } from "discourse-common/utils/decorators";

class OmitEmojiInit {
  constructor(owner, api) {
    setOwner(this, owner);

    const emoji = settings.omitted_emoji.split("|");
    const emojiGroups = settings.omitted_emoji_groups.split("|");

    api.modifyClass("component:emoji-picker", {
      pluginId: "omit-emoji",

      @on("init")
      omitFromRecent() {
        let favorites = this.emojiStore.favorites;
        emoji.forEach((e) => {
          favorites = favorites.filter((f) => f !== e);
        });
        this.emojiStore.favorites = favorites;
      },

      @observes("isActive")
      omitEmoji() {
        // Remove Emoji group buttons
        emojiGroups.forEach((eg) => {
          const emojiGroup = document.querySelector(
            `.category-button[data-section="${eg}"]`
          );
          if (emojiGroup) {
            emojiGroup.remove();
          }
        });

        // Remove emoji and groups from unfiltered list. Fires after core:
        // https://github.com/discourse/discourse/blob/fc30669db27c20ebbb8056c488656deb1f066efd/app/assets/javascripts/discourse/app/components/emoji-picker.js#L133-L152
        later(() => {
          schedule("afterRender", () => {
            emojiGroups.forEach((eg) => {
              const emojiGroup = document.querySelector(
                `.section[data-section="${eg}"]`
              );
              if (emojiGroup) {
                emojiGroup.remove();
              }
            });
            emoji.forEach((e) => {
              const emoji = document.querySelector(`img.emoji[title="${e}"]`);
              if (emoji) {
                emoji.remove();
              }
            });
          });
        }, 60);

        // Remove emoji from filtered list. A class is added when the list is filtered so we can observe it.
        const classObserver = new MutationObserver((mutationsList) => {
          mutationsList.forEach((m) => {
            if (m.attributeName === "class") {
              emoji.forEach((e) => {
                const emoji = document.querySelector(`img.emoji[title="${e}"]`);
                if (emoji) {
                  emoji.remove();
                }
              });
            }
          });
        });

        const emojiPicker = document.querySelector(".emoji-picker");
        if (emojiPicker) {
          classObserver.observe(emojiPicker, { attributes: true });
        }
      },
    });

    api.modifyClass("component:d-editor", {
      pluginId: "omit-emoji",
      @on("didInsertElement")
      omitEmojiAutocomplete() {
        const childListObserver = new MutationObserver((mutationsList) => {
          mutationsList.forEach((m) => {
            const nodes = m.addedNodes[0];
            if (
              nodes &&
              nodes.classList &&
              nodes.classList.value === "autocomplete ac-emoji"
            ) {
              emoji.forEach((e) => {
                const emoji = document.querySelector(
                  `img.emoji[src*="${e}.png"]`
                );
                if (emoji) {
                  emoji.parentNode.parentNode.remove();
                }
              });
            }
          });
        });

        const textareaWrapper = document.querySelector(
          ".d-editor-textarea-wrapper"
        );
        if (textareaWrapper) {
          childListObserver.observe(textareaWrapper, { childList: true });
        }
      },
    });
  }
}

export default {
  name: "discourse-omit-emoji",

  initialize(owner) {
    withPluginApi("0.8.25", (api) => {
      this.instance = new OmitEmojiInit(owner, api);
    });
  },

  tearDown() {
    this.instance = null;
  },
};
