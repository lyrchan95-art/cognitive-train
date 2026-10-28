WITH tok(slug, aname, pattern, drain, boundary, casestudy) AS (VALUES
 ('alchemist','Alchemist','transformation burnout — you rebuild systems that were merely fine','optimising things that already work','freeze one system for the week — no improvements','A platform lead we will call R. rebuilt the same internal tool three times in fourteen months. Each rebuild was defensible; together they consumed 40 percent of her team''s capacity and produced no measurable change in adoption. Her exhaustion scores dropped only when she was asked to justify each rebuild against a single user metric — and two of the three rebuilds died on the page.'),
 ('anchor','Anchor','load-bearing burnout — you are the stability everyone leans on','being the default fixer for other people''s chaos','name one thing you will stop absorbing','An operations manager we will call D. was the person everyone messaged first. A two-week log showed 61 inbound requests, of which 44 were not his responsibility and 38 were resolved by him anyway. He was not overworked by his job; he was overworked by everyone else''s unassigned work.'),
 ('catalyst','Catalyst','ignition burnout — you start the fire and then hold it alone','driving momentum others should carry','hand one initiative to a named owner','A programme lead we will call M. launched four cross-team initiatives in a year. None had a named second owner. When she took ten days off, three stalled — which she read as proof she was indispensable rather than evidence of a design fault in how she starts things.'),
 ('explorer','Explorer','novelty burnout — stimulation replaces recovery','chasing new inputs instead of consolidating','protect one unstimulated hour a day','A designer we will call T. described his evenings as restful: podcasts, side projects, new tools. His recovery-experience scores were near the floor on detachment and relaxation. He was not resting; he was substituting novelty for rest, which the nervous system does not accept as payment.'),
 ('guardian','Guardian','protective burnout — you shield the team and forget yourself','pre-empting problems that never arrive','let one small problem surface without intercepting it','A team lead we will call S. intercepted every escalation before it reached her engineers. Over one quarter she absorbed 27 incidents; a review found 19 would have been resolved by the owning engineer within a day. Her protection was real, and it was also the mechanism converting her team''s stress into her exhaustion.'),
 ('harmonizer','Harmonizer','absorption burnout — you carry other people''s emotional weather','unpaid emotional labour and conflict smoothing','say a clean no once, with no apology or explanation','A client manager we will call P. ended most days emotionally flat but could not point to hard work. Her calendar showed nine hours a week of unbilled "temperature management" — pre-calls, repair conversations, apologising for other people''s decisions. Surface acting, not workload, was the depleting variable.'),
 ('perfectionist','Perfectionist','polish burnout — the final tenth of a task costs you half your energy','rework driven by standards nobody else requires','ship one thing before it feels finished and let it stand','An analyst we will call K. spent an average of 6.5 hours per report; peers spent 3. Blind review rated the two sets of reports as equivalent in usefulness. The extra 3.5 hours were invisible to everyone except his own exhaustion.'),
 ('rebel','Rebel','friction burnout — you spend energy fighting battles that do not move you','opposing by reflex rather than by choice','pick one battle this week and concede the rest','An engineer we will call J. logged every disagreement he entered for a month: 23 in total, 4 of which changed a decision. The other 19 cost him political capital and roughly a working week of cognitive load with no outcome attached.'),
 ('sage','Sage','depth burnout — you go deeper than the situation requires','over-preparing before you are allowed to act','answer one question with what you already know','A consultant we will call A. prepared 40-page briefs for 20-minute conversations. Clients read the summary. When she capped preparation at 90 minutes for a quarter, satisfaction scores were unchanged and her weekly hours fell by nine.'),
 ('sentinel','Sentinel','exhaustion from over-control — you burn out carrying risk nobody asked you to carry','vigilance loops: re-checking work that is already done','delegate one owned task per week and do not audit it','A delivery lead we will call N. re-checked work she had already approved an average of 3.4 times per item. Error rate after the first check was 2 percent; after the third, still 2 percent. The additional checks bought no quality — they bought temporary relief from anxiety, at compounding cost.'),
 ('strategist','Strategist','analysis burnout — thinking substitutes for recovering','over-modelling low-stakes decisions','decide one reversible thing in under five minutes','A product strategist we will call L. spent eleven days modelling a pricing change that was reversible within a week. The model did not change the decision. What it changed was eleven days of sleep quality — his mind stayed in the problem long after he closed the laptop.'),
 ('visionary','Visionary','idea exhaustion — you burn out starting, not finishing','context-switching between unfinished concepts','commit to one idea for the full week and decline new ones','A founder we will call C. held nine live concepts at once. Cognitively, each open loop kept a share of working memory occupied. When he formally paused six of them in writing, his self-rated exhaustion fell within two weeks — before any workload actually changed.')
), tpl(daynum, body) AS (VALUES
(1, $t$WEEK 1 — BURNOUT SELF-DIAGNOSIS

THE EVIDENCE

In 2019 the World Health Organization classified burnout in ICD-11 as an occupational phenomenon — not a medical condition, not a personality flaw, and not a synonym for tiredness. The definition matters, because it locates the cause in the interaction between a person and a work environment rather than inside the person alone.

The dominant research model, developed by Christina Maslach and Michael Leiter over three decades, describes burnout along three dimensions: emotional exhaustion (your energy is gone), depersonalisation or cynicism (you begin to distance yourself from the work and the people in it), and reduced professional efficacy (you no longer believe your effort produces results). These dimensions do not arrive together. Exhaustion usually appears first, cynicism second, and the collapse of efficacy last. That sequencing is the single most useful diagnostic fact in this entire programme: cynicism is not a character change, it is a late-stage symptom with a timestamp.

The Job Demands–Resources model (Demerouti, Bakker, Nachreiner and Schaufeli, 2001) explains the mechanism. Every role carries demands — workload, ambiguity, emotional labour, interruption — and resources — autonomy, feedback, support, clarity, meaning. Burnout is not produced by high demands. It is produced by high demands running for a sustained period without matching resources. This is why two people in the same job burn out at completely different rates, and why "work less" is such an unreliable prescription. Stephen Hobfoll''s Conservation of Resources theory (1989) adds the compounding term: losing resources hurts more than gaining them helps, and depleted people spend their remaining resources defensively, which is exactly how a slow decline becomes a fast one.

YOUR SIGNATURE, %1$s

Burnout has a generic definition and a personal signature. Yours is %2$s.

Read that again slowly, because the point is not that you work hard. The point is that your exhaustion has a shape. It fires in specific conditions, protects you from a specific feeling, and is rewarded by your environment often enough to keep going. Generic advice fails you because it treats the symptom — tiredness — while leaving the mechanism intact. Rest applied to an intact mechanism buys you two weeks.

CASE STUDY

%5$s

Notice what the case has in common with the research: the behaviour was rational in isolation, invisible in aggregate, and only became changeable once it was measured. This is the whole logic of Week 1.

THE MECHANISM

Every burnout pattern has four parts, and this week you are going to name yours.

The trigger. The condition that reliably starts the loop — a change of direction, an unowned problem, an ambiguous standard, an emotional temperature in the room.

The behaviour. What you automatically do next. For you, this most often shows up as %3$s.

The relief. The short-term payoff. This is why the loop survives. The behaviour lowers anxiety within minutes, which is a stronger reinforcer than the cost you pay two months later. Behavioural science is unambiguous here: immediate, reliable rewards beat delayed, probabilistic costs almost every time.

The cost. Energy, attention, sleep quality, relationships, and eventually the belief that your work matters.

Most people can name the behaviour and the cost. Almost nobody can name the trigger and the relief, and those are the two that make the pattern changeable.

WHY SELF-DIAGNOSIS COMES FIRST

There is a strong practical reason this programme starts with measurement rather than intervention. Research on recovery interventions consistently finds that generic interventions produce small, short-lived effects, while targeted interventions matched to the specific demand produce larger and more durable ones. If your depletion comes from emotional labour, a time-management course will do nothing. If it comes from vigilance, a meditation app helps you tolerate vigilance rather than reduce it.

There is also a diagnostic trap worth naming. Exhaustion distorts self-assessment. When you are depleted you systematically over-attribute the problem to your own inadequacy — "I should be able to handle this" — which is a symptom of reduced professional efficacy, not an accurate reading of your capacity. Writing the pattern down while you can still see it clearly is a defence against your own later judgement.

THIS WEEK''S PRACTICE

Write your burnout signature in one sentence, in your own words. Then list three concrete situations from the last month where it fired. For each one, note the trigger, what you did, what it relieved, and what it cost. Keep it factual and specific — dates, names, hours. Vague entries produce vague insight.

WHAT USUALLY GOES WRONG

Two failure modes. The first is writing a confession instead of a diagnosis: "I am bad at boundaries" is a judgement, not data. The second is diagnosing the organisation instead of the loop. Your workplace may well be a genuine contributor — Weeks 3 and 5 deal with it directly — but this week the object of study is the mechanism you control.

By the end of the week you should be able to finish this sentence without hesitating: "I burn out when ___, because I respond by ___, which relieves ___ and costs me ___." Everything in the next five weeks operates on that sentence.$t$),
(2, $t$WEEK 2 — ENERGY MANAGEMENT

THE EVIDENCE

Energy is not time, and treating the two as interchangeable is the most common reason time management fails burned-out people. Two hours of ambiguous, emotionally charged, interrupted work costs far more than four hours of clear, autonomous work. The Job Demands–Resources literature captures this as the difference between hindrance demands, which deplete without producing growth, and challenge demands, which are effortful but restorative in the medium term. Same hours. Opposite energetic sign.

Three findings should shape how you audit this week.

First, interruption is expensive in a way calendars never show. Gloria Mark''s field research at UC Irvine found that after an interruption people take roughly 23 minutes to return to the original task, and that interrupted work is often completed faster but at the price of higher stress, frustration and time pressure. You do not simply lose the interrupted minute; you pay a reacquisition tax and a physiological one.

Second, unfinished tasks keep consuming capacity. Work on attention residue (Sophie Leroy, 2009) shows that when you switch tasks without a clean cognitive closure, part of your attention stays on the previous task and measurably degrades performance on the next. Every open loop you carry is charging rent.

Third, availability itself is a demand. Barber and Santuzzi''s research on workplace telepressure — the urge to respond immediately to messages — links it to poorer detachment, worse sleep quality and higher burnout, independent of actual workload. Being reachable is not free even when nobody reaches you.

YOUR LEAK, %1$s

Every archetype leaks energy through a signature channel. Yours is %3$s.

This is not a general failing; it is a specific, repeated transaction. You spend a real resource to buy a real relief, and because the relief is immediate you never price the transaction. The purpose of this week is to make the price visible. Once a leak is visible, it becomes negotiable. While it stays invisible, it is simply "how work feels".

CASE STUDY

%5$s

The pattern in that case is the one you are auditing: the cost was never hidden by anyone. It was simply never counted.

THE AUDIT PROTOCOL

For seven consecutive days, log every meaningful block of work — 20 minutes or longer — with three pieces of information.

The task, in five words or fewer.

An energy sign: plus if you ended with more energy than you started, zero if flat, minus if depleted.

One word for why. Ambiguity. Conflict. Rework. Interruption. Isolation. Pointlessness. Vigilance.

Do it at the end of each block, not at the end of the day. Retrospective energy ratings are heavily contaminated by how the day ended — a real effect in experience-sampling research, and the reason diary studies use in-the-moment reports.

At the end of the week, sort by the minus column and read the "why" words. You are looking for one thing: the largest single drain that is tied to your trigger from Week 1. Not the longest task — the most expensive one per unit of time.

WHY THIS BEATS TIME TRACKING

Time tracking tells you where hours went, which is useful for billing and useless for burnout. Energy tracking tells you which activities pay you and which tax you, and that is the input for the only three interventions available to you: eliminate, redesign, or delegate.

Job crafting research (Tims and Bakker) shows that small, self-initiated changes to how a role is structured — reducing hindrance demands, increasing structural and social resources — predict lower exhaustion and higher engagement over time. Crucially, these changes are usually modest. People do not craft their way out of burnout with a new job; they do it by removing two or three specific recurring drains.

THE COUNTERINTUITIVE PART

Some of your biggest drains will be tasks you are good at. Competence is not the same as energetic profitability, and being reliably good at something is exactly how it becomes your permanent, unpriced responsibility. Expect to find at least one high-competence, high-drain task in your log. That is usually the one worth renegotiating first.

Expect also to find one surprise plus. Most people discover an activity they had been treating as optional that reliably restores them. Protect it before you change anything else.

THIS WEEK''S PRACTICE

Audit your energy drains for seven days using the plus / zero / minus method. At the end of the week, name in writing the single largest drain tied to your trigger, and state which of the three moves you will make on it: eliminate, redesign, or delegate. One drain. One move.

WHAT USUALLY GOES WRONG

People log for three days and stop, which produces a biased sample of a bad week. People also rate tasks by how much they enjoyed them rather than by their energetic aftermath — a hard conversation can be a plus, and a comfortable meeting can be a minus. Rate the aftermath, not the mood.

Week 3 converts the drain you name into a boundary that actually holds.$t$),
(3, $t$WEEK 3 — BOUNDARY SETTING

THE EVIDENCE

A boundary that fights your temperament fails by Wednesday. A boundary that uses it holds for years. That is not motivational framing; it follows directly from boundary theory and from what we know about self-regulation.

Boundary theory (Ashforth, Kreiner and Fugate, 2000; extended by Kreiner''s work on segmentation and integration preferences) describes how people manage the borders between roles. Some people are segmenters, who need hard separation, and some are integrators, who function well with permeable borders. Interventions that impose the wrong style produce more strain, not less. There is no universally correct boundary — there is only a boundary matched to how you actually operate.

The second relevant finding is about effort. Self-regulation research consistently shows that rules requiring continuous active suppression degrade under fatigue, time pressure and social stress — exactly the conditions under which you most need them. Rules that change a default, by contrast, keep working when you are depleted because they do not require a decision. This is why implementation intentions — Peter Gollwitzer''s "when situation X occurs, I will do Y" format — outperform goal statements across hundreds of studies. The specificity does the work that willpower otherwise has to.

The third finding is social. Perlow and Porter''s Boston Consulting Group experiments, published in Harvard Business Review in 2009, gave consultants scheduled, predictable time off — a night a week genuinely uncovered, with the team responsible for covering. Client service did not suffer. Satisfaction, retention intent and perceived value of work all improved. The mechanism was not the time off itself; it was that the boundary was collective, explicit and covered. Private boundaries collapse under the first escalation. Declared, covered boundaries survive.

YOUR BOUNDARY, %1$s

Yours is this: %4$s.

Notice what this boundary is not. It is not a personality change, and it does not ask you to stop being %1$s. It redirects the same instinct into a form the environment cannot bill you for. You are not being asked to care less about %3$s — you are being asked to spend that care once, deliberately, instead of continuously and by reflex.

CASE STUDY

%5$s

In almost every documented case of a boundary that stuck, three features are present: it was specific, it was told to at least one other person, and it had a time limit short enough to feel survivable. Vague, private, permanent boundaries are the ones that fail.

THE MECHANICS

Write the boundary as an implementation intention, not an intention. "When a request arrives after 6pm, I acknowledge it and answer at 9am" is executable at 6.15pm while tired. "I will have better boundaries" is not.

Tell one person. Declaration converts an internal rule into a small social contract and, more importantly, it removes the ambiguity that makes other people escalate. Most boundary violations are not defiance; they are people acting on the assumption you never corrected.

Set a five-day window. Short windows lower the stakes enough to actually start and long enough for the environment to react — which is the data you want.

Decide the exception rule in advance. A boundary with no exception is brittle and you will break it once and abandon it. Name the one condition under which it does not apply, and treat everything else as inside the rule.

WHAT THE RESISTANCE MEANS

You will feel discomfort within 48 hours. It is worth understanding what that discomfort is. It is not evidence that the boundary is wrong. It is the extinction burst of a habit that has been reinforced for years: the relief you normally get from %3$s does not arrive, and your nervous system files that as a problem. Loss aversion amplifies it — the anticipated cost of holding the line feels roughly twice as large as the equivalent gain.

The prediction is testable, which is what Week 5 uses. Write down what you expect to go wrong. Then compare it with what actually happens. In practice the feared consequence materialises far less often than predicted, and when it does it is smaller and more recoverable.

THIS WEEK''S PRACTICE

Set your archetype boundary in writing, using the "when X, I will Y" format. Tell one person. Hold it for five working days. Record, each day, one line: did it hold, what pressure did it meet, and what did that pressure cost or save you.

WHAT USUALLY GOES WRONG

Two things. People set a boundary that is really three boundaries, and it collapses under its own weight. And people apologise while setting it, which signals negotiability — a clean, unexplained no is more durable than a justified one, because a justification invites a counter-argument.

Week 4 builds the recovery rituals that make holding a boundary cheaper.$t$),
(4, $t$WEEK 4 — RECOVERY RITUALS

THE EVIDENCE

The most useful finding in the recovery literature is that recovery is dose-dependent rather than duration-dependent. Short, frequent, well-designed interruptions of the stress response outperform rare, long ones.

Sabine Sonnentag and Charlotte Fritz''s Recovery Experience Questionnaire (2007) identifies four mechanisms that make non-work time actually restorative: psychological detachment (mentally switching off from work), relaxation (low activation, positive affect), mastery (a challenging activity unrelated to work), and control (choosing how you spend the time). Time off that lacks these — scrolling, worrying, half-working — reliably fails to restore. This is the mechanism behind the widely observed vacation fade-out effect: holiday gains in wellbeing typically dissipate within two to four weeks of return, because the holiday removes exposure without changing the daily response.

Micro-break research points the same direction. Studies on short within-day breaks (Kim, Park and Niu, 2017; Sianoja and colleagues on lunchtime park walks and relaxation exercises) find that brief, deliberate, detached breaks predict lower end-of-day fatigue and better next-morning energy, with the quality of the break mattering more than its length. A 10-minute walk outdoors without your phone does more than a 40-minute lunch spent on email.

Two mechanisms explain why brief works. Physiologically, interrupting the stress response before it consolidates prevents the prolonged activation that Brosschot''s perseverative cognition hypothesis identifies as the real health cost — it is not the stressor that damages you, it is how long your body stays switched on afterwards, largely driven by rumination and anticipatory worry. Behaviourally, small rituals survive bad weeks. A 90-second practice is still executable on the day you are most depleted, which is precisely the day it matters.

RECOVERY AGAINST YOUR PATTERN, %1$s

Your pattern is %2$s, and your leak runs through %3$s. That determines what counts as recovery for you.

If you leak through vigilance or control, your recovery must include a genuine detachment cue — a hard stop that makes checking impossible for a defined period, not merely unlikely. If you leak through emotional labour, your recovery must include solitude or low-demand company, because more social warmth does not restore you; it continues the shift. If you leak through novelty, your recovery must be deliberately unstimulating, because stimulation is what your nervous system keeps mistaking for rest. If you leak through analysis or polish, your recovery must include a mastery activity with a clear finish line, because unfinished cognitive work follows you home.

CASE STUDY

%5$s

In each of these cases, adding rest to an unchanged pattern did nothing. What worked was recovery designed against the specific mechanism.

THE THREE RITUALS

Install three, no more. Each has a job.

The reset — 90 seconds between work blocks. Stand, look at something more than six metres away, breathe out longer than you breathe in for six cycles. The extended exhale is the fastest voluntary route into parasympathetic activation available to you at your desk. Its purpose is to stop the stress response from stacking across the day.

The hard stop cue — one repeatable physical action that ends the working day. Closing the laptop and putting it in a drawer. A ten-minute walk that functions as a commute. Changing clothes. Ashforth''s work on boundary-crossing rituals shows that physical transition markers make psychological detachment substantially easier; without one, work simply bleeds into the evening in a diluted, unrestful form.

The shutdown note — two lines written before you stop. What is genuinely unfinished, and the first action tomorrow. This addresses attention residue and the Zeigarnik effect directly: the mind holds unfinished tasks in an active state, and externalising them with a concrete next step reliably releases that hold. It is the cheapest sleep intervention in this programme.

THIS WEEK''S PRACTICE

Install all three rituals and run them every working day this week. Track only one thing: a 1-to-10 evening energy rating. Do not add anything else. Do not optimise them. Consistency at low quality beats excellence twice.

WHAT USUALLY GOES WRONG

People make the rituals too big — a 45-minute routine survives four days. They make them conditional on a good day, so the rituals disappear on the days they exist for. And they treat passive numbing as recovery: research is consistent that low-effort media consumption scores poorly on detachment and mastery, which is why two hours of it can leave you flatter than when you started.

One honest caveat: rituals are not a substitute for reducing demand. If your role genuinely requires 60 hours of high-conflict work a week, no breathing protocol will hold that. Rituals lower the cost of exposure; Weeks 3 and 5 lower the exposure itself. You need both.$t$),
(5, $t$WEEK 5 — WORKPLACE RE-ENTRY

THE EVIDENCE

This is the week most burnout programmes skip, and it is the week the evidence says matters most.

The strongest critique of individual burnout interventions is that they treat an environmental problem with a personal remedy. Reviews of workplace interventions — including Awa, Plaumann and Walter''s frequently cited analysis — find that person-directed programmes produce meaningful effects that fade within about six months, while combined person- plus organisation-directed interventions produce effects that persist for a year or more. Maslach and Leiter make the same argument from their six areas of worklife model: burnout is predicted by mismatches in workload, control, reward, community, fairness and values. Five of those six are properties of the environment, not of you.

That does not make individual action pointless. It makes unilateral, invisible individual action pointless. Protocols survive in isolation and die in meetings.

What works instead is closer to a controlled experiment. Proactivity research (Grant and Ashford) shows that self-initiated changes at work are far more durable when they are made visible, framed in terms the organisation values, and tested rather than declared. The BCG predictable-time-off studies found the same thing: the intervention held because it became a team norm with explicit coverage, and because the team reviewed it openly each week.

YOUR RE-ENTRY TEST, %1$s

You now have three things: a named pattern (%2$s), a named drain (%3$s), and a boundary (%4$s). This week you carry all three into the exact environment that produced the burnout, once, deliberately, and you observe what the system does.

This is a test, not a transformation. One situation. Chosen in advance. Real enough that it could actually go wrong.

CASE STUDY

%5$s

What changed the outcome in that case was not more resilience. It was a single situation handled differently, in public, with the result written down — which converted a private belief into shared evidence.

THE PROTOCOL

Choose the situation before it happens. Pick a recurring, real, medium-stakes scenario, not the worst one on your calendar. You are collecting evidence, not testing your limits.

Write the prediction. Before it happens, write in one sentence what you fear will occur if you hold the boundary. Be specific: who reacts, how badly, what it costs. This is the step almost everyone skips, and without it your memory will quietly rewrite the outcome to match the fear.

Make one thing visible. Say the boundary out loud once, in neutral, organisation-legible language. "I''m going to leave that with Sam so I can hold the release date." Framed as a trade-off, not as self-care, it is almost never refused.

Record what actually happened. Immediately afterwards, write three lines: what you feared, what occurred, and the size of the gap.

WHAT THE GAP MEANS

Across the cases we see, the gap runs one of three ways.

Almost nothing happened. This is the most common outcome and the hardest to accept, because it means the constraint was internal and you have been paying for it for years. Take the win and repeat the behaviour until it stops feeling remarkable.

Something happened, and it was manageable. Mild friction, one awkward conversation, a small renegotiation. This is a successful test. Manageable friction is the price of a boundary, not evidence that it failed.

Something happened, and it was not manageable. Retaliation, punishment, or a demand that you resume absorbing the load. This is important information about the environment rather than about you. In JD-R terms you have documented a structural resource deficit. It moves the problem from "how do I cope" to "what do I change, escalate, or leave" — a strategic question, and one with a clearer answer than the coping question ever had.

THIS WEEK''S PRACTICE

Run one real workplace situation using your boundary. Write what you feared, what happened, and the gap between them. Then decide one repeat: the same move, in the same recurring situation, next week.

WHAT USUALLY GOES WRONG

People choose a situation with no stakes, which produces no information. They over-explain the boundary, which invites negotiation. And they treat one bad reaction as proof the whole approach fails — a single data point from one person, usually the person most benefiting from your previous default.

Week 6 turns this from an experiment into a system that survives without your attention.$t$),
(6, $t$WEEK 6 — MAINTENANCE PLAN

THE EVIDENCE

Burnout returns through drift, not relapse. That distinction decides how you protect the last five weeks of work.

Follow-up studies of burnout interventions show a consistent shape: effects are strongest immediately after the programme, meaningfully weaker at six months, and largely gone at twelve unless something in the ongoing system sustains them. The decay is not caused by a dramatic failure. It is caused by dozens of small, individually reasonable re-accommodations — one extra project, one boundary quietly dropped during a busy quarter, one ritual skipped because the week was hard.

Three findings tell you how to build against drift.

Leading indicators beat lagging ones. Exhaustion is a lagging indicator — by the time you feel it, the mechanism has been running for weeks. Longitudinal work on the burnout sequence shows earlier, more reliable signals: sleep onset difficulty, weekend rumination, dread on Sunday evening, irritability with people you like, and — one of the strongest — loss of psychological detachment in the evenings.

Review beats resolve. Habit research and organisational reliability research converge on the same conclusion: systems that are checked on a schedule survive, while systems that depend on remembering to care do not. A recurring 15-minute review is a stronger protection than any level of commitment.

External perspective corrects distorted self-report. Depleted people systematically under-report depletion, partly through the reduced-efficacy dimension of burnout — you interpret a systemic problem as a personal inadequacy, which makes you less likely to raise it. One trusted person with permission to tell you the truth is a genuine correction mechanism, not a nicety.

YOUR TRIPWIRES, %1$s

Your pattern is %2$s and your drift will be specific. It will not announce itself as burnout; it will announce itself as %3$s creeping back into your week, one justified instance at a time, and as %4$s quietly lapsing during a busy stretch.

So your tripwires should be behavioural and countable, not emotional. "Am I stressed" is unanswerable. "Did I hold the boundary this week — yes or no" is answerable in three seconds while tired, which is when you will be answering it.

CASE STUDY

%5$s

The follow-up in that case is the instructive part. What held was not motivation; it was a fifteen-minute Friday review that made the drift visible within one week instead of one quarter.

BUILDING THE PLAN

One page. Three parts.

Three tripwires. Choose leading indicators, each with a threshold. Examples that work: "I checked messages after my hard stop on three or more nights." "I re-did work that was already approved twice or more." "I said yes to something I had decided to decline." "I woke between 3 and 5am thinking about work twice in a week." Each one must be answerable yes or no without interpretation.

One weekly review slot. Fifteen minutes, same time each week, in your calendar as a real appointment. Read the tripwires. If none fired, stop. If one fired, note it. If two fired in the same week, take one corrective action immediately — usually reinstating the boundary from Week 3 or the hard stop from Week 4.

One truth-teller. Name a specific person, ask them explicitly, and tell them the two signs to watch for. The request is short: "If you see me doing X again, say it plainly. I won''t defend it." Explicit permission converts a bystander into an early-warning system.

WHY THIS WORKS WHEN WILLPOWER DOES NOT

The plan is designed for your worst week, not your best one. It requires no motivation, no self-assessment of mood, and no memory. It surfaces problems while they are still cheap — and the difference between catching the pattern at week two and catching it at month four is roughly the difference between a small adjustment and a recovery.

There is also a limit worth stating plainly. Maintenance protects a workable situation; it does not fix an unworkable one. If your tripwires fire every week despite consistent practice, the honest conclusion is not that you need more discipline. It is that the demands and resources in your current role do not balance, and the next decision is structural: renegotiate the role, change the team, or change the environment. That is a legitimate outcome of this programme, not a failure of it.

THIS WEEK''S PRACTICE

Write your one-page maintenance plan: three tripwires with thresholds, one weekly review slot in your calendar, and one person who has explicit permission to tell you the truth. Then run the first review before the week ends.

WHERE YOU STARTED

Six weeks ago you had tiredness and a vague sense that something was structurally wrong. You now have a named pattern, a measured drain, a boundary that has survived contact with your workplace, three rituals that work on your worst day, and a review system that catches drift early.

That is the difference between managing burnout and being burnout-proof: not that the pressure disappears, but that you can see it arriving while there is still time to act.$t$)
)
UPDATE pathway_days d
SET content = format(t.body, tok.aname, tok.pattern, tok.drain, tok.boundary, tok.casestudy),
    read_minutes = 7,
    updated_at = now()
FROM pathways p, tok, tpl t
WHERE d.pathway_id = p.id
  AND p.slug = 'burnout-proof-' || tok.slug
  AND d.day_number = t.daynum;