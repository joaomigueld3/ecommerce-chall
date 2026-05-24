# Boxing 2 Instructions — Versão de Trabalho com Codex

> Objetivo deste arquivo: manter as instruções do PDF em formato `.md` e adicionar um fluxo prático considerando que você usará o **Codex** como apoio para criar prompts, revisar o repositório e ajudar na avaliação dos modelos.  
> Importante: o Codex é apenas apoio. A execução oficial da task continua sendo feita com **Claude Code + Trace Extractor**, seguindo exatamente os comandos e regras do projeto.

---

## Como usar o Codex sem invalidar a tarefa

Use o Codex para ajudar em três coisas:

1. **Escolher/entender o repositório**
   - Identificar stack, testes, dependências e pontos de complexidade.
   - Achar áreas boas para feature, bugfix, refactor ou testes.
   - Verificar se a task parece complexa o bastante.

2. **Criar e melhorar o prompt oficial**
   - Gerar um prompt claro, específico e difícil.
   - Evitar prompt vago, simples demais ou dependente de acesso externo.
   - Garantir que o prompt peça validação, testes e explicação final.

3. **Apoiar a avaliação dos modelos**
   - Comparar resultados dos modelos A e B.
   - Ajudar a revisar se seguiram instruções, se o código funciona e se houve regressões.
   - Ajudar a transformar observações em rationales em inglês.

Não use o Codex para:

- Alterar manualmente o código final gerado pelos modelos antes da submissão.
- Misturar soluções do Model A com o Model B.
- Rodar uma avaliação enviesada favorecendo um modelo.
- Substituir seu julgamento humano.
- Escrever rationales falsos ou genéricos.

---

## Fluxo recomendado com Codex

### Fase 1 — Antes de rodar os modelos

1. Abra o repositório no Codex.
2. Peça para o Codex analisar:
   - stack;
   - estrutura de pastas;
   - comandos de instalação/teste/build;
   - possíveis bugs ou melhorias;
   - complexidade provável da tarefa.
3. Peça 3 a 5 ideias de prompt.
4. Escolha uma ideia e peça ao Codex para refiná-la em inglês.
5. Revise manualmente o prompt final.

### Fase 2 — Rodando Model A e Model B

1. Rode o Trace Extractor para **um modelo por vez**.
2. Use o launch command gerado pelo Trace Extractor.
3. Não reutilize launch command entre conversas.
4. Execute a conversa oficial no Claude Code.
5. Não deixe o Codex interferir dentro da conversa oficial, exceto como apoio externo para você entender logs, erros e critérios.

### Fase 3 — Depois de cada modelo

1. Salve observações factuais:
   - conseguiu entender a task?
   - rodou testes?
   - quebrou algo?
   - fez mudanças coerentes?
   - ignorou instruções?
   - precisou de muita intervenção?
2. Use o Codex para organizar essas observações.
3. Escreva rationales em inglês, específicos para cada modelo.
4. Compare os modelos apenas pelo comportamento observado na task.

---

## Prompt para pedir ajuda ao Codex antes da task

```text
I need help preparing an evaluation task for a coding model comparison project.

Please analyze this repository and suggest a difficult but realistic task that can be completed in this codebase.

Focus on:
- repository structure;
- stack and dependencies;
- available tests/build commands;
- areas where a feature, bugfix, refactor, or test improvement would be meaningful;
- whether the task is complex enough for a model evaluation;
- risks that could make the task invalid, too vague, too simple, or dependent on unavailable external services.

Do not modify files yet. First, give me 3 to 5 candidate task prompts in English.
```

---

## Prompt para o Codex refinar o prompt oficial

```text
Refine the following model-evaluation prompt.

Requirements:
- write it in English;
- make it specific and realistic;
- include clear acceptance criteria;
- require the model to inspect the repo before coding;
- require tests or a clear validation strategy;
- avoid vague requirements;
- avoid external services or unavailable credentials;
- do not make it too easy;
- do not ask for destructive actions.

Draft prompt:
[PASTE MY DRAFT HERE]
```

---

## Prompt para o Codex ajudar na avaliação depois de cada run

```text
I just completed one model run for a coding evaluation task.

Help me organize my evaluation notes, but do not invent anything.
Use only the observations I provide.

Please structure the evaluation around:
- task understanding;
- correctness of implementation;
- test/build behavior;
- code quality;
- instruction following;
- autonomy;
- regressions or risks;
- final rating rationale in English.

My notes:
[PASTE MY NOTES HERE]
```

---

## Checklist rápido

Antes da task:

- [ ] Claude Code está exatamente na versão `2.1.149`.
- [ ] Trace Extractor está atualizado.
- [ ] Repositório não está na lista proibida SWE-Bench.
- [ ] Prompt está em inglês.
- [ ] Prompt é específico e difícil o suficiente.
- [ ] Prompt não depende de acesso externo indisponível.
- [ ] Você sabe como rodar teste/build/validação.

Durante a task:

- [ ] Rodar apenas um modelo por vez.
- [ ] Usar o comando correto do Model A ou Model B.
- [ ] Não reutilizar launch command.
- [ ] Manter Trace Extractor rodando.
- [ ] Não misturar conversas ou soluções.
- [ ] Registrar problemas reais observados.

Depois da task:

- [ ] Coletar artefatos exigidos.
- [ ] Escrever rationales originais em inglês.
- [ ] Avaliar pelo comportamento observado, não por preferência pessoal.
- [ ] Não enviar ratings falsos, placeholders ou genéricos.

---

# Transcrição das instruções do PDF

> Observação: a seção abaixo mantém a transcrição do PDF em Markdown. Como o PDF original é baseado em imagem, pode haver pequenos erros de OCR. Sempre confira o PDF original quando houver dúvida.

---

# Boxing 2 Instructions

## Page 1

IMPORTANT: Please update Claude Code to v2.1.149 before
starting this project. You must use EXACTLY v2.1.149 ! Do
not upgrade to a later version.

YA, IMPORTANT PROJECT TIMELINE &

Submissions should ideally be in by May 23, 2:00 PM PDT. Tasks submitted after
this won't be useful for us. Please read the following.

* This project will be closed by May 23, 8:00 AM PDT. If you want to work on it, you need to grab a task before then.
* You'll still be able to submit after this deadline and log your time, but please try to get your submission in before it. We

understand this can be difficult if you're starting late, and there's no penalty for late submissions in that case.

* Please do NOT submit incomplete tasks or fake/placeholder ratings or rationales just to get something in before the
deadline. Bad data is unusable regardless of when it's submitted.

Vg IMPORTANT PROJECT INFORMATION (ALWAYS RE-READ) &
Safety Classifier Testing

With the new models we are using in this project, there is a new feature that you will be helping to test. Some prompts may
hit safety classifiers that block the session, and these will appear as red-colored errors in CC. You might encounter this
feature while using either of the models in this project.

* When this happens, you will need to explicitly log that you have hit a blocking classifier by answering the “Classifier
Block" question for the corresponding model.

* You will then need to manually switch to Opus 47 by running /model and selecting the option labeled "Default
(recommended) Opus 4.7 with 1M context" (usually the first option).

* Next, it will ask "Switch model?" and warn you that your next response will be slower. Select the option labeled “Yes,
switch to Opus 4.7 (1M context)." Switching models to Opus 4.7 will allow your conversation to proceed,

* Important! Itis critical that you begin your conversation with the assigned model and ONLY switch models if/when
you encounter the safety classifier message.
* Be very careful and double check that you've switched to Opus 4.7 and not some other model.
* Beginning the conversation with Opus or switching models without hitting the safety classifier block will invalidate

your submission.

* When rating your overall experience with the model, if you were forced to switch models, you should think back to the

whole conversation and rate the experience including the Opus 4.7 portion of the task.

* The tmux log, json! transcript, trace extractor log, debug file, and final codebase you upload for that model should
reflect the entire session, including the post-switch Opus 47 portion. Do not start a fresh session for Opus 4.7. You do
not have to do anything different for this; everything will be captured automatically as usual as long as you follow the
above instruction correctly.

* Note: The error There's an issue with the selected model ... is NOT a classifier block. It indicates a problem with
your configuration steps. Please follow the instructions for setting the env vars and launching Claude Code closely.
This is what a classifier block errors might look like (you may see another message of a similar type; if you're unsure, ask in

chat):

Latest Extractor Version:
* Make sure to download the Trace Extractor's latest version using the link in Step 4: Trace Extractor Setup and according

to the update above.

* You must use the extractor launch commands exactly as provided in the instructions to start the Trace Extractor. Do
NOT make any manual changes; copy-paste them as-is.

* You will also need to upload the native Claude Code session transcript ( .json1 ) and debug file for your
conversations now.

* Please closely follow the instructions under Running Your Task when starting your conversations as they've been

updated to account for the latest extractor version. You will find all the extractor-related files you need in a single

---

## Page 2

directory after having your conversations

Prompt Reuse:
+ Ifyou've submitted a task in the previous Boxing @ projects comparing Claude Code models, you're welcome to use
the same prompt here as long as it's difficult enough (one of the models had a task success rating of <= 3). New

prompts are always encouraged if you're able to come up with them fast.

* See Guidelines for Repo/Prompt Re-use under Preparing Your Task for more details.

Submission Quality:
* For each task, you are expected to make a reasonable effort to resolve major environment setup blockers so the model
has a fair chance to run and test its code.
* In Interactive tasks, the model may point out that it can't run tests without installing new dependencies or
software, you should work with the model to achieve this.

+ All responses, prompts, and rationales must be in English

* Each rationale field should contain original writing specific to what that field is asking for. Do not copy-paste the same
text across different fields. Even if similar reasoning applies to both models, write each rationale from scratch as you
think through it for that specific model.

*  Donot submit with false ratings or missing/placeholder rationales to meet the deadline. Submissions with missing or
low quality work are not usable regardless of when they are submitted

* Submitting false ratings, missing/placeholder rationales, or vague and low-effort explanations may result in
removal from the project.

Note on Autonomous tasks:

For autonomous tasks, your prompt should be complex enough that the model needs at least 1.5 hours to complete it. If a

model stops prematurely with incomplete work or skips steps you explicitly asked for, that's still a valid submission. Rate it

accordingly and penalize the model for not following through.

* If both models finish your prompt fully and correctly in just a few minutes, your prompt is not hard enough and you
should increase the complexity.

* Ifyou've put together a genuinely complex prompt but the models finish under the 1.5 hour mark, you do not need to
redo the conversations. Submit with appropriate ratings and aim for more complexity in future tasks.

Vv & Project Overview

In this project, you'll use Claude Code, a command-ine (CLI) tool that lets you interact with LLMs in your terminal for
coding tasks with local file access. You will either converse with the models interactively or have them work autonomously,
depending on your assigned interaction mode.

Your workflow
1. Set up your environment: Install Claude Code, configure tmux, and set up the Trace Extractor.

2. Prepare your task: Find a repository (if applicable) and design a realistic, challenging prompt (think:
level SWE) according to the task requirements.

3. Run with both models: Have a conversation with each model, then collect artifacts.

4, Rate and compare: Rate both models independently, provide your rationales, and submit.

You will use the same repository, setup, starting prompt, and overall conversation direction with both models. Think of this
as running the same task twice with different models, then judging which one did better.

Quick Instruction Navigation: Before You Start | Getting Started | Claude Code Settings | Task Setup | Prepa

| Bunning Your Task | Evaluation Guidelines | FAQs and Troubleshoot

Quick Question Navigation: Task Setup | Model A Ratings | Model B Ratings | Comparison Ratings

Y_ »# Before You Start

\ Claude Code Access

* You will need your @aidatatrainer.com login to proceed. You can locate your FHPXPCGEH2X3@aidatatrainer.com
credentials under the Workspace Account Details in your DataAnnotation profile by clicking on your name in the
upper right corner of the page, then selecting "Profile"

* You will need to log in to https://claude.ai/ via Google SSO ("Continue with Google”) using your
FHPXPCGEH2X3@aidatatrainer.com email before you install Claude Code.

---

## Page 3

* Once logged in, you will see an invitation to join the Al Data Trainer Org. Accept the invitation. This will enable
you to use the organization in Claude Code to access the test models.

* Note: If you don't see an org invitation or can't get access, let us know in the project chat and do not proceed
with the task. Once an admin confirms access has been granted, or you check back later and see an invitation, you
can continue.

When conversing with the test models, you will have to set two env vars ( ANTHROPIC_BASE_URL and
ANTHROPTC_CUSTOM_HEADERS ) in addition to logging in via an enterprise account. Please follow the instructions under
Running Your Task closely!

Y Your Assignments for This Task

Interaction Mode Autonomous
Repo Needed Yes

Model A claude-obsidian with xhigh reasoning effort
Model B claude-quartz with xhigh reasoning effort

Ifyou do not feel confident in submitting a task with these assignments, please skip the task, There's no penalty for
skipping.

Key Reminders

* Read these instructions carefully before starting. They are updated between iterations, so review them even if
you have worked on this project before.

+ Attimes, you may notice that the models / CLI tools will ask for permission or manual approval when performing
certain actions like writing to files or executing bash commands, even when it may feel excessive or inappropriate
to do so. Going forward, want you to refrain from considering these behaviors in your ratings and explanations.
The only exception is when describing behavioral issues when flagging the Product / Harness behavioral issue
specifically, where mentioning this is still allowed. You can still feel free to take note of these for your own
reference however, or mention this behavior in the optional comments question.

* Asarelated reminder, please do not penalize model latency when slowness is
control.

ues may be out of the model's

* All responses (prompts, rating rationales, etc.) must be in English.

* When providing your ratings, make sure to be as detailed as possible such as making references to specific code,
text output from the models, etc.

* We are especially interested in your rationales for the Code Quality and Interaction Quality ratings. So make
sure to be on the lookout for any patterns or interesting findings there!

* Alternate which model you start with across tasks. Do not always use the same one first.
* Ifyou set up the Trace Extractor for a previous project, you need to re-download it for this project. See the Trace

Extractor Setup section for details.

* Please complete and submit your task in no more than 9 hours after entering work mode. If you decide not to
submit, use Exit Work Mode so the task becomes available for others.

© Ifyou encounter issues, check the FAQs and Troubleshooting section before asking in the project chat.

* Provide clear, specific rationales for all your ratings (3-5+ sentences each). Reference specific turns, code
changes, or model behaviors from your conversation. When flagging behavioral issues, follow the guide for what
to look for and what to document.

---

## Page 4

. “In turn 3, the model ignored the requirement to use PostgreSQL and set up SQLite instead, which broke
the integration tests that relied on PostgreSQL-specific queries." (Specific turn, exact deviation, clear impact.)

* XX "The model ignored one of the instructions but otherwise followed them well." (Which instruction? What
did it do instead? What was the impact?)

* There will be a question asking for your estimated leveling which represents your experience working in SWE-
related fields. The minimum level allowed is an L4 (2-5 years, independently handles complex tasks, solid domain
knowledge). Even if you don’t have said experience in the industry, you can still work on this project if you are
absolutely confident you can come up with and handle complex coding tasks as someone of at least an L4 level
would.

__ & Getting Started (One-Time Setup)

For this project, you will need git , tmux, Claude Code , and the Trace Extractor . You may want to work in an isolated
environment such as a Docker container with internet access, as you wil likely need to install dependencies for the
repositories you work with.

> STEP 1: Install and Configure tmux

\ STEP 2: Install Claude Code

Claude Code is supported on Linux and macOS. Windows users can use WSL

1. Install native Claude Code CLI

curl -fsSL https://claude.ai/install.sh | bash -s 2.1.149

2. Verify Installation Click to copy ([)

claude -

Make sure your version is exactly v2.1.149 . If you see another version, please rerun the install command (pinned to
v2.1.148 ) given above!

If you already have Claude Code installed, run the install command again to update. Refer to the Claude Code Docs for
assistance if something went wrong,

\ STEP 3: Test Claude Code Access

After installing Claude Code, you need to authenticate it with your FHPXPCGEH2X3@aidatatrainer.com account:

1. Start Claude Code: claude Click to copy (Q)

2. Select a color scheme using arrows then Enter key to select.
3. Complete authentication using: claude account with subscription . Select this and press Enter.

4, An authentication URL will be provided and/or open in your browser.

1, Navigate to the URL and log in via Google SSO ("Continue with Google”) using your
FHPXPCGEH2X3@aidatatrainer.com account (found on your DataAnnotation profile page)

2. Click the organization Ar vata Trainer Org
3. Click Authorize, close the window once it says you can and return to your terminal.

4, The terminal should now have a success message: Login successful. Press Enter to continue... Press Enter

to continue.
5. Press Enter again, then again to accept the recommended default terminal settings.

6. If prompted to confirm whether you trust the project and/or want to enable Bypass Permissions mode, select
the "yes" option.

5. To test if the whole process worked, ask it a question (e.g., "What is in this folder?")

6. Claude should respond if setup was successful

---

## Page 5

7. fexit in Claude Code to exit Click to copy (F)

STEP 4: Set Up the Trace Extractor

The Trace Extractor captures conversation data for your submissions. You need to download it once per project

IMPORTANT: Make sure to check that you have the correct Trace Extractor version. Run: uv run python main.py --
version Click to copy (()

© Itshould show: cli-trace-extractor v1.11.0

* If it returns an error or an older version, please download the latest version following the steps below.

If you already have the Trace Extractor from a previous project

1. Delete the old cli-trace-extractor folder: rm -rf ~/cli-trace-extractor Click to copy (F)

2. Download and extract the new version (link) to your home ( ~/ ) directory

3. Navigate to the folder and run uv syne

You do not need to repeat the certificate steps if you've already done them before. If you encounter issues, try a
complete reset by first following the cleanup steps in the FAQs and Troubleshooting section, then following the
full first-time setup below.

> If this is your first time setting up the Trace Extractor

\ & Claude Code Settings (May vary per project)

For this

project, you are allowed to have your own Claude Code settings. However, the following restrictions apply:

You must
* Use Claude Code version v2.1.149 , no other version for this iteration

* Use --dangerously-skip-permissions and the assigned effort level when launching Claude Code. Both are
automatically included in the launch command output by the Trace Extractor.

You cannot
* Use extreme or unusual configurations. Don't worry about this if you haven't changed advanced Claude Code settings.

* Use complex looping/retry configurations.

* Have dozens of MCP Servers set up.

Y al Task Setup and Distribution

For each task, you will be assigned an interaction mode and select a domain, task type, and language (click the links to
jump to each question):
* Interaction Mode: Pre-assigned. Determines whether you converse with the models interactively or have them work
autonomously, and what your opening prompt needs to look like.

* Domain: Frontend, Backend, or Other. Select all that apply based on what your task involves.

* Task Type: Feature Development, Debugging, Refactoring, etc. Select all that apply.

* Language: The primary programming language for your task

The links above take you to the corresponding questions, which include detailed definitions and current submission

distributions. When making your selections, consider:

* Which categories are underrepresented. Check the distribution charts on each question and prioritize categories that
need more coverage,

* Your own expertise and confidence in evaluating model output in that area.

---

## Page 6

v # Preparing Your Task

For each task, you will design an opening prompt. Your task assignment will also indicate whether you need to find a
starting repository. Both models receive the same opening prompt and start from the same setup.

Your prompt should be realistic and challenging, the kind of work you would assign to a senior or staff-level software
engineer. Aim for tasks where the models are likely to struggle, make mistakes, or produce incomplete solutions. That said,
don't discard your task if the models happen to do well and don't make mistakes.

© Ifyou're having trouble finding a repo or creating a prompt, look for open (unresolved) issues or feature requests on
GitHub that you feel confident you could resolve yourself, and design a difficult prompt around that.

Y Guidelines for Repo/Prompt Re-use

For the below guidance, assume a ‘project iteration’ refers to an individual project entry from your project dashboard,

based on the title and date of the project.

* Boxing @ - Create Challenging Prompts, Talk to Assigned Models in Claude Code and Compare Responses -
04/05/26 is a different iteration than Boxing @ - Create Challenging Prompts, Talk to Assigned Models in
Claude Code and Compare Responses - 04/03/26

If you choose to re-use setups, you will need to keep count of the prompts/repos that you have used, and take the
following restrictions into account.

Re-using Repos
For a given repo, you can re-use the same repo but up to 10 times total, and any submissions across all different
project iterations count toward this.

* You can re-use the same repo within multiple submissions i
time limit.

the same project iteration if you haven't hit your 10-

* After submitting 10 tasks with the same repo, you will need to find a new one entirely (e.g. modifying the commit
hash is not enough).

Re-using Prompts

For all submissions in a particular project iteration, each of your prompts must be unique. In other words, you cannot

re-use the same prompt within the same project iteration.

* You can re-use a prompt from a previous project iteration, but only if the prompt was challenging enough (one
of the models received a Task Success rating of <= 3)

* Ifyou re-use a prompt from a previous iteration, remember that you can only re-use prompts up to 5 times total.

New prompts/repos are always encouraged however if you're able to come up with them fast.

\ Guidelines for Repository Selection

If your task requires a starting repository, select your repo type when you reach the repo type question:

* Open-Source: A publicly available, open-source repo from GitHub. You will provide the URL, commit hash, and an
archive of the initial repo state.

*  Closed-Source: A private or proprietary codebase not publicly accessible on GitHub or other public repositories,
such as your own personal private repositories. You consent to the repo being used for evaluation purposes by
models and reviewers.

Regardless of your selection, your repository must meet these requirements:

* Appropriate size: At least 50-100+ files with real dependencies as the bare minimum, and substantial enough for
the task to be meaningful

* Ideally, we are especially interested in repos with 200+ files!

* Real-world project: A realistic codebase with proper structure and dependencies, not a collection of standalone
scripts or trivial examples

© Correct language: Primarily written in your chosen language
* No existing solution: There must be no publicly available PR that solves your prompt
* Properly licensed: If open-source, it must be under a permissive license (MIT, Apache, BSD, etc.)

* Not in SWE-Bench: Your repo must not be one of the 12 repos in the SWE-Bench list. More broadly, prefer repos
that are not part of any SWE-Bench variant to minimize overlap with existing benchmarks.

You can use a repository up to 10 times in this project.

---

## Page 7

‘_ SWE-Bench Repos: Do NOT Use These

Your repo should NOT be one of the 12 listed repos below that are contained in the SWE-Bench-Verified dataset
* Django (Python web framework): https://github.com/django/django
+ SymPy (symbolic mathematics library): https://github.com/sympy/sympy.
* Sphinx (documentation generator): https://github.com/sphinx-doc/sphinx
* Matplotlib (plotting library): https://github.com/matplotlib/matplotlib.
*  Scikit-learn (machine learning library): https://github.com/scikit-learn/scikit-learn,
* Flask (micro web framework): https://github.com/pallets/flask
* Requests (HTTP library): https://github.com/psf/requests
*  Pytest (Python testing framework): https://github.com/pytest-dev/pytest
* Astropy (astronomy tools for Python): https://github.com/astropy/astropy,
+ Xarray (labeled N-dimensional arrays): https://github.com/pydata/xarray
* — Seaborn (statistical data visualization): https://github.com/mwaskom/seaborn

*  Pylint (Python code static analyzer): https://github.com/pylint-dev/pylint

Y Guidelines for Prompt Design

Your prompt should be a realistic coding task that a real developer might work on, used to evaluate how well the
models handle real-world coding scenarios.

Your prompt should
* Be focused on the codebase: Focus on building, enhancing, fixing, or extending the codebase.

* Be comprehensive: Include all necessary context and specific requirements. Clearly state how success will be

measured (e.g,, “passing all unit tests", "API returns correct response format", “UI component renders without
errors").

* Be realistic: Something a contributor or developer might actually work on. No artificial or contrived scenarios,
Tasks should reflect actual production development work.

* Be difficult: The kind of work you would task a senior or staff software engineer with.

X Avoid prompts that

* Request changes to hypothetical applications that the model does not have access to.
* Are too vague ("make this better")

© Require write access to a GitHub repo (e.g., pushing commits, running GitHub actions).

* Have solutions available in existing PRs on the repository.

Both models receive the same opening prompt, but what happens after that depends on your assigned interaction
mode:

* Interactive: Your follow-up turns will naturally differ based on how each model responds. You don't need identical
follow-up prompts. Keep working toward the goals of your opening prompt and keep the overall conversation
direction similar for a fair comparison.

* Autonomous: Your opening prompt is the only input the model receives. Make sure it includes all context,
requirements, acceptance criteria, and verification steps. The model should not have to ask you for clarification,
Aim for prompts that would require the model to work continuously for more than 1.5 hours to produce a
complete solution

© Tips for finding idea:

* Browse trending repositories on GitHub for inspiration
* Look at the repository’s issue tracker for real problems to solve

* Consider common feature requests or improvements that would be valuable to the project

Example prompt topics (your prompt should be more detailed and align with your task type and domain selections):

* Build a full-stack web application with authentication, real-time data, and a modern framework (Next js, Supabase,
etc.)

* Debug a data pipeline failure involving dependency conflicts and performance bottlenecks across multiple services
* Refactor a large React codebase from CSS modules to Tailwind while preserving visual parity

* Set up a Kubernetes deployment with CI/CD pipeline, including debugging configuration issues

---

## Page 8

* Plan and implement a cross-service integration with schema migrations and backwards compatibility
* Diagnose and fix concurrency bugs in a Go or Rust service under load

* Review and modemize a legacy codebase: identify architectural issues, propose a migration plan, and begin
implementation

* Resolve package migration conflicts when upgrading major framework versions across a monorepo

Good and Bad Prompt Examples

Below are some real prompts where the models were genuinely challenged and took a long time to complete.

Do NOT copy these examples or make minor edits to them. Doing so will result in your removal from the project.

YY Good Examples
> Example 1: Full-Stack Android App from Scratch (No Repo)
> Example 2: Containerization & Deployment on OpenShift (Repo)
> Example 3: N-Body Gravity Solvers for Astrophysics Library (Repo)

> Example 4: Competitor Analysis Engine for Pharma Wholesaler (No Repo)

\ Bad Examples
> Example 1: Too Vague
> Example 2: Too Simple
> Example 3: Requires Unavailable External Access

> Example 4: Unclear Requirements with Missing Files

Y GB Running Your Task

You will complete two runs of your task, one with each model. The process is the same for both. Only the model changes.

Model order: Use Google's Flip a Coin feature to determine which model to start with.
* Ifyou get heads, start with Model A ( claude-obsidian )

* Ifyou get tails, start with Model B ( claude-quartz )

Before your first run: If your task requires a starting repository, follow the initial repo state question to set it up (you only
upload the initial archive once). Otherwise, create an empty project folder. Note that you will not see that question if a

starting repository is not required for the task.

IMPORTANT: Please use a separate project directory for each conversation. Even if you reset the repo to its
reusing the same directory may allow Claude to carry over project-level memories from previous conversations.

ial state,

STEP 5: Complete Each Model Run

For each run, you will use two terminal windows: one for Claude Code inside a tmux session and one for the Trace
Extractor. Follow these steps:

1. Set the required environment variables (in the terminal where you have the project open): Click to copy (()

export ANTHROPIC_BASE_URL="https: //a

taannotation.tech/api/11m_proxy/org_b"

export ANTHROPIC_CUSTOM_HEADERS="X-Proxy-Key: 2MF7WEGG643VSNDFQFYGFAP2'

---

## Page 9

2. A Kill any existing tmux sessions: tmux kill-server Click to copy (C)

+ Tmux sessions only inherit environment variables set before the session was created, Reattaching to a pre-
existing session means your proxy variables won't be available. Killing the server ensures a fresh start.

* This kills all tmux sessions. Make sure you don't have other sessions with unsaved work.
3. Start a tmux session in your project directory: tmux Click to copy (C)

4, Start the Trace Extractor in a second terminal window. Leave it running.

© Navigate to the Trace Extractor folder: cd ~/cli-trace-extractor Click to copy [(F)

* Run the command for this run's model
* Model A (claude-obsidian): uv run python main.py --claude --nodel “claude-obsidian[1m]" --effort-

level xhigh --permission-mode skip --disable-autoupdate --require-cli-version 2.1.149

Click to copy (F)

* Model B (claude-quartz): uv run python main.py --claude --model “claude-quartz[1m]" --effort-level

xhigh --permission-mode skip --disable-autoupdate --require-cli-version 2.1.149 Click to copy (()

* You will see a "Run dir" path mentioned in the extractor output. Remember it!

*  Alaunch command will appear under the "Run this in your project directory” text, automatically copied to
your clipboard. Do not reuse the launch command between conversations! Always use the launch
command generated by the trace extractor for each run.

5. Launch Claude Code. Back in your tmux terminal, paste the command from your clipboard. It will look something
like this (this is just an example; do not copy it from here):

DISABLE_AUTOUPDATER=1 CLAUDE_CONFIG_DIR-<path to active config dir inside the trace extractor dir>
NODE_EXTRA_CA_CERTS="/User's /you/ .mitmproxy/mitmproxy-ca-cert.pem
HTTPS_PROXY="http://127.0.0.1:8080" ANTHROPIC_MODEL=<cnodel name> claude --dangerously-skip-
permissions --effort <effort level> --settings sys ThinkingEnabled" :true}' --debug

* NOTE: You will need to re-authenticate every time you launch Claude Code with this trace extractor
‘command. This is because the extractor creates a new Claude config directory for every run. The steps should
be the same as Step 3: Test Claude Code Access every time.

* Choose Claude account with subscription to authenticate via Google SSO (“Continue with Google")
using your FHPXPCGEH2X3@aidatatrainer.com and the AI Data Trainer org.
* Choose the defaults for the rest of the prompts.
* You should also see CLAUDE CODE TRACE EXTRACTOR v1.1.0 in the output banner. This confirms you're using
the right version of the trace extractor.
6. Verify before sending your first prompt:
* The correct model name is displayed at the top of Claude Code.

* Remember the "Run dir* path from step 2 above? Immediately after launching CC or after sending the first
prompt, you should see a new json file at that path. If you see no such file, your conversation will not be
saved. Make sure you are using the launch command generated by the Trace Extractor.

7. Send your opening prompt and work with the model.
* For Interactive tasks, work collaboratively and aim for 5-10+ meaningful turns over 1.5-2.5 hours,
* For Autonomous tasks, do not interrupt the model or provide additional guidance.
* Keep the Evaluation Guidelines in mind.

8. Collect your artifacts. Run /cost in Claude Code and note the token usage in the corresponding question item.
Then, in this order:

* Export the tmux transcript (see "How to Capture Your tmux Transcript" below) and upload it to the
corresponding question item

* Exit Claude Code: /exit
* Stop the Trace Extractor: ctri+C in the Trace Extractor terminal (note the log file paths it prints)

* After stopping the trace extractor, you will see some files listed under "Files to share for this run". You need to
upload these files to the corresponding questions for the model you just conversed with. The extractor will
show you the path to these files, which will be under /cli-trace-extractor/logs/<conversion_id>/

* You will need to upload trace.json, session.jsonl , and debug.txt

* Optional] For each run of the trace extractor, a new directory will be created under /cli-trace-
extractor/ as /claude_config/<conversation_id> . You may optionally delete this folder for clean-up if

you have successfully uploaded the above files to the task.

---

## Page 10

* Review the FAQs and Troubleshooting section for instructions if the trace extractor crashes.

* Archive the final repo state and upload per the instructions on the corresponding upload question

IMPORTANT: Follow the above order for collecting artifacts exactly. Stopping the Trace Extractor before exiting Claude
Code will cause connection errors and incomplete logs. Exiting Claude Code before capturing the tmux log risks losing
the full conversation transcript.

For the second run: Restore your project to its initial state per the initial repo state question and repeat the above

steps for the other model

Y How to Capture Your tmux Transcript

When you are done with a model session, do the following before exiting Claude Code:
* Press Ctri+b, then : to open tmux command mode (the green bar at the bottom turns yellow). Enter the
save command for your model:
* Model A (claude-obsidian): capture-pane -S -; save-buffer ~/<REPO FOLDER NAME>-log-model-a.log;
delete-buffer
* Model B (claude-quartz): capture-pane -S -; save-buffer ~/<REPO FOLDER NAME>-log-model-b.10g3

delete-buffer

* Save the file outside the repo directory so it is not included in the final archive

If the green bar does not tum yellow, you might not have pressed the key sequence correctly.

* Hold ctrl and press b , release both, then hold shift and press ; (to type :)

* You can check your tmux prefix key with tmux show -g prefix

One of the most important rules in this project is to compare the two models using purely objective judgment. Base your
ratings on what happened in this task, not on personal preference or outside assumptions. As a reminder, alternate which
model you start with across tasks to avoid ordering bias.

Before rating, review the behavioral issue definitions and examples in the Behavioral Issue Guide (available on each model's
flagging question). When flagging issues, make sure your explanations reflect the specifics outlined there.

[New] Permission Prompts from the CLI Tools

At times, you may notice that the models / CLI tools will ask for permission or manual approval when performing certain
actions like writing to files or executing bash commands, even when it may feel excessive or inappropriate to do so. Going
forward, we no longer want to see these instances being flagged or considered within your ratings or explanations. The
only exception is when describing behavioral issues when flagging the Product / Harness behavioral issue specifically,
where mentioning this is still allowed. You can still feel free to take note of these for your own reference however, or
mention this behavior in the optional comments question.

Conversation Length
Aim to have similar-length conversations with each model.

* For Interactive tasks: Aim for conversations that last 1.5-2.5 hours and span 5-10+ meaningful turns.

* For Autonomous tasks: Send a single complex and detailed prompt and let the model work on its own for at least 1.5
hours.

What counts as a meaningful turn?

+ Aturn where the model makes incremental progress (correct or incorrect) toward the task: new edits, decisions, or
statements. If the model only asks clarifying questions or punts without doing anything, don't count that as a
meaningful turn.

* Avoid interrupting the model mid-response unless you encounter API issues.

Model Slowness.

When you rate model performance, particularly in the Interaction Quality dimension, be aware that models sometimes
experience slowdowns due to high demand, rate limits, or conversation compacting. This is not necessarily the model's
fault.

+ Slowness caused by a model mistake (bad tool calls, incorrect assumptions causing a loop): You can penalize the
model.

+ Slowness out of the model's control (rate limiting, conversation compacting, high demand): Do not penalize the
model.

---

## Page 11

Focus on observable behavior
When you rate or compare the models, base your judgment only on what you see in this task:

* How correct and complete are the solutions?
* How safe and appropriate are the changes?
* How clear and reliable is the reasoning and explanation?

* How efficient and readable is the resulting code?

Ignore things like brand, prior reputation, or how much you “like” one model in general. Treat each run as if you were
seeing the model for the first time.

Keep the Models’ Runs Independent
© Do not reuse insights you discovered with the first model to “guide” the second one (for example, specific bug
locations, exact fix strategies, or test cases you only learned because the first model found them).

* Let each model stand on its own: interact naturally, but as if you were seeing the repo fresh,
* Begin with the same fresh starting environment for each model.

* Ifyou accidentally benefit from knowledge gained with the first model, note that briefly in your comments

Apply the Same Standards to Both Models
* Ifyou forgive small mistakes for one model (e.g., minor formatting issues), do the same for the other.

* Ifyou reward good behaviors (e.g,, writing tests, explaining a refactor clearly), reward those equally for both models.

* When you compare them, ask yourself: “Would | give the same score/comment if the other model had produced this
exact behavior?"

Common Unconscious Biases
* Fam

ity bias: Favoring the model you've used more in the past just because you're comfortable with it.
* Brand / reputation bias: Assuming one model must be better because of what you've heard elsewhere.

* First-impression / recency bias: Letting a very early win or a very recent failure outweigh the rest of the session.

Ifyou catch yourself thinking things like "I usually like X better" or "X is supposed to be stronger at coding," pause and
refocus on the actual logs, code, and outcomes from this specific task.

Be Explicit and Honest in Your Comments
© Refer to specific turns, behaviors, or code changes that led to your rating.

* Ifsomething outside the model's control affected your perception (e.g,, environment issues, time pressure), mention
that briefly.

* Ifyou felt uncertain between two ratings, say so and explain what tipped the balance.

FAQs and Troubleshooting

\ Frequently Asked Questions

---

## Page 12

I'm having issues uploading —_This most commonly occurs when you attempt to upload a very large file, For

a tarball! The upload isnot _reference, 10 GB is the maximum limit for a file upload, but even less than this
progressing or I'm receiving _ would be ideal to be on the safe side. Do not attempt to upload anything larger
500-like errors! than 10 GB.

Ifyou are experiencing upload issues, try any of the following ordered from
what you should try first to last:

1. Check your internet connection to ensure this your connection not the
cause.

2. Refresh the page and try uploading the file again

3. Experiment uploading a much smaller file to the question. If this works, it
means a large file size is likely the cause. In this case, you can remove extra
dependencies such as node modules from your upload to reduce the file
size. This is optional. You can exclude them if your uploads are taking too
long or resulting in errors due to file size.

4, If nothing works, please leave a comment in the Optional Comments
question with a publicly-accessible link to the files/tarballs you were
unable to upload, with a very small placeholder uploaded in the actual
question item. Make sure to note the error you came across in your
optional comments and the chat!

+ Ifeven uploading a small file doesn't work, after you've attempted all
other exhaustive options, you can use the escape hatch. Make sure to
upload proof and all relevant work you have completed. This should
be extremely rare

Can | use pre-existing No, do not use CLAUDE.md, AGENTS.md, or similar Al guidance files. If the repo
CLAUDE.md, AGENTS.md, or already contains any of these, delete them before starting your task. Do not run
similar Al guidance files? /init in Claude Code to create them either.

Should | report No, do not use the number of turns from the log files; the Trace Extractor's logic

total_turns fromthe JSON for counting turns is different from what we need from you. Keep track of the

log files as the number of turns manually as you converse with each model, counting only meaningful
turns for each model? turns as defined in the Evaluation Guidelines.

How many turns should | For Interactive tasks, aim for 5-10+ meaningful turns with each model. A
have with each model? meaningful turn is where the model makes incremental progress (correct or

incorrect) toward the task: new edits, decisions, or statements. If the model only
asks clarifying questions or punts without doing anything, don't count that as a
meaningful turn

For Autonomous conversations, you will send a single prompt to each model
and let the model run on its own. You will not steer the model or give it advice.

Should | count interruptions __Avoid interrupting the model mid-response unless you encounter API issues. If

as separate turns? you feel you need to interrupt for other reasons (e.g., the model is about to do
something harmful, an unexpected loop, etc.), count that as a turn since the
model still made progress (even if wrong or incomplete).

What if my task is Double-check that the requirements from the initial prompt are actually met. If
Interactive and the model they are, it's fine to stop there and rate accordingly.

completes the task before 5

turns?

---

## Page 13

Thit a technical error in the Not necessarily. If you encounter a technical issue (such as the model running

conversation with a model! _excessively slow without displaying output, hitting a context limit, sudden API
Should | use the escape errors, etc), try to continue the conversation with follow-ups if possible.
hatch?

If you're unable to proceed, consider whether you've seen enough of the
model's work to provide a fair assessment. Rating before reaching five turns is
allowed in these exceptional situations. When rating, judge the model based on
what it did or attempted to do rather than penalizing it for blocking API errors.

If the issue occurs very early on (eg, the first turn) and there isn’t enough to
rate, please re-attempt the conversation if time allows. However, please do not
wait indefinitely for a response. If 20-30 minutes have passed with no visible

progress, interrupt the current prompt and re-send it to see if the model shows
progress in the next few minutes. If it doesn't, try interrupting and re-sending a
couple more times without waiting as long. If the issues persist, use the escape

hatch Waltina nvar an haur with an mrnnrace at all ie tna Inne
Collapse Instructions

I want to get rid of the Trace Follow the instructions in the Removing the Trace Extractor and its Certificate

Extractor and the trusted (Optional Cleanup) section at the end of the project instructions. Only do this if
certificate added for it you do not want to make any further submissions to this project. If you remove
What should I do? it, you'd have to repeat the setup steps for any future submissions.

My trace extractor log is First, verify that your trace extractor logs are valid JSON files and that you used
valid but it's failing the correct models. If you've confirmed everything is correct, use the Error
validation. What should | Bypass field at the bottom of all questions and explain your reasoning in the
do? corresponding explanation field. This will allow you to submit the task despite

any validation errors.

Ihave an autonomous task Adjust your prompt such that any ambiguity is removed. Your prompt should be
and the model stopped to clear enough for the model to understand the exact requirements of what you
ask me clarification are asking for. When adjusting your prompt, ensure you also update any related

questions! What should |do questions here in this task as well to the updated version.
since I can't guide the
model further?

Isee the um Even if you don't have the exact experience working in the industry itself, if you
requirement to work on this are confident in your coding abilities and believe your skills to be equal or
project is L4-level above to an L4, you can still work on the project especially if you're fully capable
experience. Can Istill work —_of creating and solving the complex prompts that we ask for.

on the project?

How much time should | put For this project, you are expected to come up with your own complex prompts
aside for this project? and starting setups, then have conversations with two models and provide
many ratings. As a result, expect to put aside at least 5-10+ hours.

I'm almost finished my task Under such exceptional cases, yes, you can still submit your work. However,
but my timer is about to avoid having your timer expire often.

expire! What should | do?

Can | still submit?

Can I run two conversations _No, you must complete one conversation before moving on to the next one.
in parallel? For example, if |

happen to have an

autonomous task as a time-

saver?

Y Troubleshooting

Fix if the claude command stops working
* We have had reports of the claude command initially working but then not working later.

© The nvm installer will add the location claude is installed to your path, so that the command works again.

“Port 8080 is in use" error
* Ifyou see this error when starting the Trace Extractor, another process is using that port. Either:

* Stop the other process using port 8080, or

---

## Page 14

* Use a different port: uv run python main.py --claude --model claude-obsidian --port 8081

* The generated launch command will automatically use the new port.

“mitmproxy certificate not found” error
* Run uv run mitmproxy once, wait for it to start, then press q (or Ctrl+C) to quit. This generates the required
certificates in ~/.mitmproxy/ . Then retry starting the Trace Extractor,

Trace Extractor log file not created or empty
* Check that you started the CLI tool using the exact command provided by the Trace Extractor (the one copied to
your clipboard).

© The log is only created after at least one API call is made.

* Make sure that the Trace Extractor has already created a new log file under /logs/ after you've entered Claude
Code using the command output by the extractor (or after you have sent the first prompt)

CLI tool won't connect / shows connection errors
* Make sure the Trace Extractor is running before you launch the CLI tool.

* Use the exact command provided by the Trace Extractor; don't modify it.
* Verify the proxy port matches (default is 8080)

* Make sure you have installed the mitmproxy certificate to your system's trusted certificates (as described in the

Trace Extractor setup).

“Client TLS handshake failed" in Trace Extractor output
* This usually means the certificate isn't trusted by your system. Re-run the command to add the mitmproxy

certificate to your system's trusted certificates (as described in the Trace Extractor setup).

Accidentally stopped the Trace Extractor before exiting the CLI tool
+ The CLI tool will show connection errors for any subsequent messages.
* Any conversation data after the Trace Extractor stopped won't be captured.

* You will have to restart the conversation to ensure that the entire conversation is captured by the trace extractor in
a single JSON file.

* There might be a partial log saved in the logs/ directory (the Trace Extractor saves periodically) but we
cannot use partial saves.

* Please try to avoid this situation by following the instructions closely. In the very rare case where you
accidentally stop the Trace Extractor early while many turns into a conversation, you can refer back to the
partial log to recall your prompts and approach (it might be helpful if the model follows a similar trajectory in
are-attempt).

Multiple conversations ended up in one log file
© This happens if you exit the CLI tool and restart it without restarting the Trace Extractor. All conversations during a
single Trace Extractor session go into the same file.

* For clean separation between conversations, restart the Trace Extractor between runs.

The Trace Extractor crashed and the logs are missing
* Inthe event that logs are lost or fragmented due to a trace extractor crash, you may continue with your task.

* Upload BLANK placeholder logs so that you can submit your task. Please do NOT upload some other
conversation's log in its place.

* Make sure to delete the claude_config/active directory, or even just your entire claude_config directory, to
reset the trace extractor after a crash.

Y Removing the Trace Extractor and its Certificate (Optional Cleanup)

Ifyou are done with this project and want to remove the Trace Extractor and its certificate from your system, follow the
steps below.

Only do this if you do not want to make any further submissions to this project. If you intend to submit more tasks, leave
the setup as it is. Removing it means you would have to repeat the setup steps for any future submissions.

1, Remove the certificate from your system's trusted certificates:

---

## Page 15

© macOS: Click to copy (F)

sudo security delete-certificate -c mitmproxy -t /Library/Keychains/System. keychain

© Linux / Windows (WSL): Click to copy (©)

sudo rm /usr/local/share/ca-certificates/mitmproxy.crt

sudo update-ca-certificates

macOS note: If the command fails with “ambiguous, matches more than one certificate’, use one of these alternatives:

© Delete by SHA-1 hash: Run security find-certificate -a -c mitmproxy -Z /Library/Keychains/System.keychain
to find the hashes, then run sudo security delete-certificate -Z <HASH> -t
/Library/Keychains/System.keychain for each hash (remember to replace <HASH> with the actual hash), OR

* Use Keychain Access GUI: Open Keychain Access -> System -> Certificates -> search mitmproxy -> delete all
matches

2. Delete the mitmproxy certificates and Trace Extractor folders: Click to copy ()

rm -Pf ~/.mitmproxy

rm -rf ~/cli-trace-extractor

Code of Conduct Support © 2026 DataAnnotation. All rights reserved.
