// Humorous Loading Messages for YouTube Summarizer Extension

const LOADING_MESSAGES = {
  // General AI Processing
  general: [
    "Teaching AI to skip the boring parts...",
    "Convincing the robots to watch YouTube for you...",
    "AI is taking notes so you don't have to...",
    "Compressing 20 minutes into 20 seconds of wisdom...",
    "Making your attention span proud...",
    "Extracting the good stuff like a digital juicer...",
    "AI is doing the heavy lifting while you grab coffee...",
    "Turning rambling into readable...",
    "Your personal video speed-reader is working...",
    "Making long videos short and sweet...",
  ],

  // YouTube/Video Specific
  youtube: [
    "Skipping the 'like and subscribe' reminders...",
    "Fast-forwarding through the sponsor segments...",
    "Finding the actual content between the ads...",
    "Filtering out the 'um's and 'uh's...",
    "Looking for the point in all this footage...",
    "Converting talking into thinking...",
    "Separating signal from ramble...",
    "Mining gold from the YouTube ore...",
    "Distilling hours into highlights...",
    "Making clickbait worth the click...",
  ],

  // Time-Saving Focused
  timeSaver: [
    "Saving you from 20 minutes of 'getting to the point'...",
    "Your future self will thank you...",
    "Time is money, we're making you rich...",
    "Giving you your life back, one summary at a time...",
    "Because life's too short for long videos...",
    "Turning procrastination into productivity...",
    "Making binge-watching educational...",
    "Your shortcut to smartness is loading...",
    "Converting hours into insights...",
    "Making Netflix jealous with our speed...",
  ],

  // Study/Educational
  educational: [
    "Taking notes like the smart kid in class...",
    "Creating your cheat sheet for knowledge...",
    "Making studying feel less like studying...",
    "Your AI study buddy is cramming for you...",
    "Turning lectures into digestible wisdom bites...",
    "Making the professor proud (and concise)...",
    "Converting brain fog into brain food...",
    "Your personal academic assistant is working...",
    "Making learning feel like cheating (legally)...",
    "Distilling knowledge like a digital library...",
  ],

  // Tech/Nerdy
  techie: [
    "Algorithms are doing algorithmy things...",
    "Machine learning is learning the machine...",
    "Neural networks are networking neuronally...",
    "Running video.exe through summary.dll...",
    "Compiling wisdom from source material...",
    "Processing natural language unnaturally fast...",
    "Training AI to be your personal intern...",
    "Converting analog thoughts to digital insights...",
    "Running compression on verbose content...",
    "Optimizing your content consumption pipeline...",
  ],

  // Motivational/Business
  motivational: [
    "Turning inspiration into information...",
    "Extracting actionable insights from motivational fluff...",
    "Making self-help actually helpful...",
    "Converting hype into highlights...",
    "Distilling success secrets from success stories...",
    "Your productivity coach is processing...",
    "Making life hacks actually hackable...",
    "Turning motivation into documentation...",
    "Creating your personal success summary...",
    "Optimizing your growth mindset intake...",
  ],

  // Meta/Self-Aware
  meta: [
    "Ironically taking time to save you time...",
    "This message is longer than some summaries...",
    "Doing what you wished you could do manually...",
    "Living in the future, one summary at a time...",
    "Making lazy people productive since 2024...",
    "Your digital alter ego is watching for you...",
    "Proving that shortcuts can be smart...",
    "Making TLDR culture proud...",
    "Because reading is so last century...",
    "Your AI doppelganger is taking notes...",
  ],
};

export type LoadingCategory = keyof typeof LOADING_MESSAGES;

// Function to get random loading message
const getRandomLoadingMessage = (category: LoadingCategory = "general") => {
  const messages = LOADING_MESSAGES[category] || LOADING_MESSAGES.general;
  const randomIndex = Math.floor(Math.random() * messages.length);
  return `<i>${messages[randomIndex]}</i>`;
};

// Smart category selection based on video content
const getContextualLoadingMessage = (
  videoTitle: string,
  videoDescription: string = ""
) => {
  const content = (videoTitle + " " + videoDescription).toLowerCase();

  if (
    content.includes("tutorial") ||
    content.includes("how to") ||
    content.includes("learn")
  ) {
    return getRandomLoadingMessage("educational");
  }

  if (
    content.includes("motivation") ||
    content.includes("success") ||
    content.includes("business")
  ) {
    return getRandomLoadingMessage("motivational");
  }

  if (
    content.includes("programming") ||
    content.includes("tech") ||
    content.includes("coding")
  ) {
    return getRandomLoadingMessage("techie");
  }

  // Default to general or youtube-specific
  return Math.random() > 0.5
    ? getRandomLoadingMessage("youtube")
    : getRandomLoadingMessage("general");
};

// Progressive loading messages (changes over time)
const getProgressiveLoadingMessage = (elapsedSeconds: number) => {
  if (elapsedSeconds < 5) {
    return getRandomLoadingMessage("general");
  } else if (elapsedSeconds < 10) {
    return getRandomLoadingMessage("timeSaver");
  } else if (elapsedSeconds < 15) {
    return getRandomLoadingMessage("youtube");
  } else {
    return getRandomLoadingMessage("meta");
  }
};

// Rotating messages:
const createRotatingLoader = (category: LoadingCategory = "general") => {
  const messages = LOADING_MESSAGES[category];
  let currentIndex = 0;

  return {
    next: () => {
      const message = `<i>${messages[currentIndex]}</i>`;
      currentIndex = (currentIndex + 1) % messages.length;
      return message;
    },
    random: () => getRandomLoadingMessage(category),
  };
};

// Export for use in extension
export {
  LOADING_MESSAGES,
  getRandomLoadingMessage,
  getContextualLoadingMessage,
  getProgressiveLoadingMessage,
  createRotatingLoader,
};