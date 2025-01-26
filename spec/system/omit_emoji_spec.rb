# frozen_string_literal: true

RSpec.describe "Emoji Omitter", system: true do
  let!(:theme) { upload_theme_component }

  fab!(:topic)
  fab!(:post) do
    Fabricate(
      :post,
      raw: ":smile: :wave: :+1: :heart:",
      topic: topic
    )
  end

  fab!(:user) { Fabricate(:admin) }

  let(:composer) { PageObjects::Components::Composer.new }

  before do
    theme.update_setting(:omitted_emoji_groups, "people")
    theme.update_setting(:omitted_emoji, "smile|heart")
    theme.save!
    sign_in user
  end

  describe "emoji picker" do
    it "does not show omitted emojis in the picker" do
      visit("/t/#{topic.id}")
      find(".post-controls .reply").click
      first(".insert-composer-emoji").click

      expect(page).to have_css(".emoji-picker")
      expect(page).to have_no_css(".emoji-picker .emoji[data-emoji='smile']")
      expect(page).to have_no_css(".emoji-picker .emoji[data-emoji='heart']")
      expect(page).to have_css(".emoji-picker .emoji[data-emoji='grin']")
    end

    it "does not show omitted emoji groups in the picker" do
      visit("/t/#{topic.id}")
      find(".post-controls .reply").click
      first(".insert-composer-emoji").click

      expect(page).to have_css(".emoji-picker")
      expect(page).to have_no_css(".emoji-picker [data-section='people']")
    end
  end

  describe "emoji autocomplete" do
    it "does not show omitted emojis in autocomplete" do
      visit("/t/#{topic.id}")
      find(".post-controls .reply").click
      
      composer.fill_content(":smi")
      expect(page).to have_css(".autocomplete.ac-emoji")
      expect(page).to have_no_css(".autocomplete [data-code='smile']")

      composer.fill_content(":gri")
      expect(page).to have_css(".autocomplete.ac-emoji")
      expect(page).to have_no_css(".autocomplete [data-code='grin']")
    end
  end
end