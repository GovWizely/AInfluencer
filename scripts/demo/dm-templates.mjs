// Synthetic DM threads. `fan` lines are inbound, `creator` lines outbound.
// {topic} is one of the creator's top hashtags, {name} their first name.

export const FAN_NAMES = [
  ["sam.codes", "Sam Rivera"],
  ["priya_builds", "Priya N."],
  ["jordan.dev", "Jordan Lee"],
  ["mika_tech", "Mika 🌸"],
  ["leo.learns", "Leo Martins"],
  ["ana.pixel", "Ana Souza"],
  ["chris_ships", "Chris O."],
  ["noor.js", "Noor"],
  ["tomasz.k", "Tomasz Kowalski"],
  ["yuki.dev", "ゆき Yuki"],
  ["dee_designs", "Dee Okafor"],
  ["felix.bytes", "Felix"],
  ["hana_ux", "Hana Park"],
  ["omar.stack", "Omar Haddad"],
  ["zoe.terminal", "Zoë Müller"],
  ["raj.ml", "Raj Patel"],
  ["bea.frontend", "Bea"],
  ["kofi.cloud", "Kofi Mensah"],
  ["lena_qa", "Lena Ivanova"],
  ["max.rustacean", "Max 🦀"],
  ["ivy.data", "Ivy Chen"],
  ["theo.ops", "Theo Laurent"],
];

export const BRAND_NAMES = [
  ["deskforge.co", "DeskForge"],
  ["nimbus_hosting", "Nimbus Hosting"],
  ["keyclack.official", "KeyClack Keyboards"],
  ["learnloop.app", "LearnLoop"],
  ["brightlamp.studio", "BrightLamp"],
];

export const SPAM_NAMES = [
  ["growth.guru.4u", "Growth Guru"],
  ["crypto_wins_daily", "CryptoWins"],
  ["promo.page.xyz", "Promo Page"],
  ["free_followers_now", "Followers ✨"],
];

export const TEMPLATES = {
  fan: [
    ["Your {topic} posts are honestly the reason I started coding 🙌"],
    [
      "Just wanted to say thank you {name}! Your last post saved me hours",
      "creator:Love hearing that, thanks for following along!",
    ],
    ["okay that setup in your last post is 🔥🔥🔥"],
    ["Been following for a year now, you're so consistent. Keep going!"],
    ["I landed my first dev job last week and your content helped a lot ❤️"],
    ["Your posts are the only reason I open Instagram lol"],
    [
      "Showed your {topic} post to my whole bootcamp cohort 😄",
      "creator:That's awesome, say hi to them!",
      "They loved it!",
    ],
  ],
  question: [
    ["Hey! What theme are you using in your editor?"],
    ["How long did it take you to get comfortable with {topic}?"],
    [
      "Do you have any course recommendations for {topic} beginners?",
      "creator:The official docs plus building a small project is the best start.",
      "Thanks! Any project idea?",
    ],
    ["What laptop do you use? Thinking about upgrading"],
    ["Quick question: do you do mentoring or code reviews?"],
    ["Where do you find ideas for your posts? I want to start sharing too"],
  ],
  collab: [
    [
      "Hi {name}! I run a small {topic} channel and would love to do a joint live session sometime. Interested?",
    ],
    ["Would you be open to a guest post on our community blog about {topic}?"],
    [
      "Hey, we're organizing a virtual meetup next month. Would you like to give a 20 min talk?",
    ],
    [
      "Love your work. Want to team up on a {topic} challenge for our followers?",
    ],
  ],
  brand_deal: [
    [
      "Hi {name}, I'm reaching out from {brand}. We'd love to sponsor a post featuring our product for your audience. What are your rates?",
    ],
    [
      "Hello! {brand} here. We're launching a new product for developers and think you'd be a great fit for a paid partnership. Can we send details?",
    ],
    [
      "Hey {name}, our team at {brand} is planning a Q1 campaign with tech creators. Budget is flexible. Do you have a media kit?",
      "creator:Thanks for reaching out! What deliverables did you have in mind?",
      "Two feed posts and three stories over a month. Could you share your rates?",
    ],
  ],
  spam: [
    ["🚀 Want 10K real followers in 7 days? DM us 'GROW' now!!!"],
    [
      "Congrats! You've been selected for our ambassador program 💎 Just pay a small registration fee to join",
    ],
    [
      "Hey dear, I can turn $500 into $5000 with crypto trading. Want to know how?",
    ],
    ["Promote your page on our network of 2M users. Cheap prices, message now"],
  ],
};

// Stand-in for a long-running conversation.
export const LONG_THREAD = [
  "Hey {name}, can I ask you something about {topic}?",
  "creator:Sure, go ahead!",
  "I'm stuck on a project and can't figure out where to start debugging",
  "creator:What's the error you're seeing?",
  "It builds fine locally but fails in CI with a timeout",
  "creator:Check whether your CI runs the same Node version as you do locally",
  "Oh wow, it was running an older version",
  "Now it gets further but one test is flaky",
  "creator:Flaky tests usually mean shared state between tests. Are they running in parallel?",
  "Yes! That's it, two tests write to the same temp file",
  "Fixed it, everything is green now 🎉",
  "Seriously, thank you so much for taking the time",
];
