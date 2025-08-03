/**
 * @jest-environment jsdom
 */

import {
  LOADING_MESSAGES,
  getRandomLoadingMessage,
  getContextualLoadingMessage,
  getProgressiveLoadingMessage,
  createRotatingLoader,
  LoadingCategory,
} from "../../../src/utils/loading_messages";

describe("Loading Messages Utils", () => {
  describe("getRandomLoadingMessage", () => {
    it("should return a message from the general category by default", () => {
      const message = getRandomLoadingMessage();
      const generalMessages = LOADING_MESSAGES.general.map(
        (m) => `<i>${m}</i>`
      );
      expect(generalMessages).toContain(message);
    });

    it("should return a message from the specified category", () => {
      const message = getRandomLoadingMessage("techie");
      const techieMessages = LOADING_MESSAGES.techie.map(
        (m) => `<i>${m}</i>`
      );
      expect(techieMessages).toContain(message);
    });

    it("should handle all available categories", () => {
      const categories: LoadingCategory[] = ["general", "techie", "motivational", "meta"];
      
      categories.forEach(category => {
        const message = getRandomLoadingMessage(category);
        expect(message).toBeTruthy();
        expect(message).toContain("<i>");
        expect(message).toContain("</i>");
      });
    });
  });

  describe("getContextualLoadingMessage", () => {
    it("should return educational message for tutorial videos", () => {
      const message = getContextualLoadingMessage("How to Learn JavaScript", "Programming tutorial");
      expect(message).toBeTruthy();
      expect(message).toContain("<i>");
    });

    it("should return motivational message for business content", () => {
      const message = getContextualLoadingMessage("Success in Business", "Motivation and success tips");
      expect(message).toBeTruthy();
      expect(message).toContain("<i>");
    });

    it("should return techie message for programming content", () => {
      const message = getContextualLoadingMessage("Programming Tutorial", "Coding best practices");
      expect(message).toBeTruthy();
      expect(message).toContain("<i>");
    });

    it("should return general or youtube message for other content", () => {
      const message = getContextualLoadingMessage("Random Video", "Just some content");
      expect(message).toBeTruthy();
      expect(message).toContain("<i>");
    });
  });

  describe("getProgressiveLoadingMessage", () => {
    it("should return different messages based on elapsed time", () => {
      const message1s = getProgressiveLoadingMessage(1);
      const message7s = getProgressiveLoadingMessage(7);
      const message12s = getProgressiveLoadingMessage(12);
      const message20s = getProgressiveLoadingMessage(20);
      
      expect(message1s).toBeTruthy();
      expect(message7s).toBeTruthy();
      expect(message12s).toBeTruthy();
      expect(message20s).toBeTruthy();
      
      expect(message1s).toContain("<i>");
      expect(message7s).toContain("<i>");
      expect(message12s).toContain("<i>");
      expect(message20s).toContain("<i>");
    });
  });

  describe("createRotatingLoader", () => {
    it("should create rotating loader with next and random methods", () => {
      const loader = createRotatingLoader("general");

      const message1 = loader.next();
      const message2 = loader.next();
      const randomMessage = loader.random();

      expect(message1).toBeTruthy();
      expect(message2).toBeTruthy();
      expect(randomMessage).toBeTruthy();
      
      expect(message1).toContain("<i>");
      expect(message2).toContain("<i>");
      expect(randomMessage).toContain("<i>");
    });

    it("should cycle through messages in rotating loader", () => {
      const loader = createRotatingLoader("techie");

      const messages = new Set();
      // Get several messages to see rotation
      for (let i = 0; i < 5; i++) {
        messages.add(loader.next());
      }

      expect(messages.size).toBeGreaterThan(1);
    });

    it("should work with different categories", () => {
      const generalLoader = createRotatingLoader("general");
      const techieLoader = createRotatingLoader("techie");
      
      const generalMessage = generalLoader.random();
      const techieMessage = techieLoader.random();
      
      expect(generalMessage).toBeTruthy();
      expect(techieMessage).toBeTruthy();
      expect(generalMessage).toContain("<i>");
      expect(techieMessage).toContain("<i>");
    });
  });
});