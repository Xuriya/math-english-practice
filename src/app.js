import katex from "./vendor/katex.mjs";

const contents = document.querySelector("#contents");
const drill = document.querySelector("#drill");
const status = document.querySelector("#status");

function element(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function hideReading(answer, button) {
  answer.hidden = true;
  button.textContent = "Show reading";
  button.setAttribute("aria-expanded", "false");
}

function createExercise(item) {
  const exercise = element("article", "exercise");
  const formula = element("div", "formula");
  formula.setAttribute("aria-label", `Formula ${item.globalOrder}`);

  try {
    katex.render(item.displayFormula, formula, {
      displayMode: true,
      throwOnError: true,
      strict: "warn",
      trust: false,
      output: "htmlAndMathml",
    });
  } catch (error) {
    formula.classList.add("formula-error");
    formula.textContent = item.displayFormula;
    console.error(`Could not render ${item.id}.`, error);
  }

  const answerId = `${item.id}-reading`;
  const answer = element("p", "reading", item.reading ?? "");
  answer.id = answerId;
  answer.hidden = true;

  const button = element("button", "reading-toggle", "Show reading");
  button.type = "button";
  button.setAttribute("aria-controls", answerId);
  button.setAttribute("aria-expanded", "false");

  if (item.reading === null) {
    button.disabled = true;
    button.title = "Reading will be added in a later step.";
  } else {
    button.addEventListener("click", () => {
      if (answer.hidden) {
        answer.hidden = false;
        button.textContent = "Hide reading";
        button.setAttribute("aria-expanded", "true");
      } else {
        hideReading(answer, button);
      }
    });
  }

  exercise.append(formula, button, answer);
  return { exercise, answer, button };
}

function createCategory(category) {
  const section = element("section", "category");
  section.id = category.id;
  section.setAttribute("aria-labelledby", `${category.id}-title`);

  const header = element("div", "category-header");
  const headingGroup = element("div", "category-heading-group");
  const heading = element("h2", "category-title", category.title);
  heading.id = `${category.id}-title`;
  const count = element(
    "span",
    "item-count",
    `${category.items.length} ${category.items.length === 1 ? "formula" : "formulas"}`,
  );
  headingGroup.append(heading, count);

  const hideAll = element("button", "hide-all", "Hide all");
  hideAll.type = "button";
  header.append(headingGroup, hideAll);

  const list = element("div", "exercise-list");
  const controls = [];
  for (const item of category.items) {
    const control = createExercise(item);
    controls.push(control);
    list.append(control.exercise);
  }

  hideAll.addEventListener("click", () => {
    for (const { answer, button } of controls) hideReading(answer, button);
  });

  section.append(header, list);
  return section;
}

function render(data) {
  const contentsList = element("ol", "contents-list");
  const fragment = document.createDocumentFragment();

  for (const category of data.categories) {
    const entry = element("li", "contents-item");
    const link = element("a", "contents-link");
    link.href = `#${category.id}`;
    link.append(
      element("span", "contents-label", category.title),
      element("span", "contents-count", String(category.items.length)),
    );
    entry.append(link);
    contentsList.append(entry);
    fragment.append(createCategory(category));
  }

  contents.replaceChildren(contentsList);
  drill.replaceChildren(fragment);
  status.hidden = true;

  if (window.location.hash) {
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    const target = document.getElementById(targetId);
    if (target) {
      const previousScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      target.scrollIntoView();
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    }
  }
}

async function loadDrill() {
  try {
    const response = await fetch("./data/what-to-say.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    render(await response.json());
  } catch (error) {
    status.classList.add("status-error");
    status.textContent =
      "The drill data could not be loaded. Serve this folder with a local web server and try again.";
    console.error("Could not load the drill data.", error);
  }
}

loadDrill();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("./service-worker.js", import.meta.url))
      .catch((error) => console.error("Could not register the service worker.", error));
  });
}
