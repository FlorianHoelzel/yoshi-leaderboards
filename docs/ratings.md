# Overall PB Elo (pb-elo-v7)

The prototype calculates one overall rating per runner from the current verified PB snapshot. It does not store ratings, award submission points, or require dates. Runner identity currently follows the prototype's display-name identity; the future backend should use stable runner IDs.

For every configured category and level, select one fastest verified PB per runner separately for the combined SNES/emulator board and VC board. Compare every pair within that board: faster is 1, equal integer milliseconds is 0.5, slower is 0. Missing PBs are not losses. A singleton board contributes no comparative evidence. Time margins do not affect the result.

## Fit and weighting

Let x be each runner's strength in natural log-odds units. Expected score against opponent j is `1 / (1 + exp(x[j] - x[i]))`. Minimize weighted logistic cross-entropy plus `0.05 / 2 * sum(x[i]^2)`. These fitted strengths determine expected results and the displayed score: `round(1500 + x[i] * 400 / ln(10))`. This is a custom Elo-style snapshot rating, rather than chronological match Elo with a K factor.

Boards belong to full-game or individual-level groups. Each group divides its evidence budget equally among C categories that have at least one comparable platform board. Each category then splits its share equally among its P comparable platform boards (SNES/emulator and VC). For a platform board with n runners, the initial depth weight is `log2(n) / ((n - 1 + 5) * C * P)`.

The field-size factor is `(n - 1) / (n - 1 + 5)`: two-runner boards retain one sixth of their unsuppressed weight; boards with 6 runners retain one half; boards with 21 retain four fifths. Multiply field-size suppression by `log2(n)` to reward competitive depth with diminishing growth. Before influence limits, a runner's total weight on one platform board is `log2(n) * (n - 1) / ((n - 1 + 5) * C * P)`. Large fields carry more evidence, but total influence grows logarithmically instead of quadratically. Full-game and level groups use the same category budget rule, and platforms share their category's budget. Field size is a proxy for depth; opponent quality still comes from the shared fit.

Only boards with at least two runners count toward P; singleton or absent platform boards do not consume a share. The same category/platform budgets and field-size suppression are used in the rating fit and run contributions. Time comparisons remain within their separate platform boards, and every eligible PB still contributes.

All comparisons use the same global strength variables. Beating stronger connected opponents supplies stronger evidence. The prior keeps undefeated runners finite and sparse ratings near 1500. The convex objective has a unique solution; simultaneous gradient descent uses the conservative step `1 / (0.05 + maxWeightedDegree / 2)`, stopping below 1e-9 strength change or after 1,000 iterations.

## Field-dependent influence limits

Let N = n − 1, the number of opponents on a platform board. Its maximum absolute PB contribution before exposure reduction is bounded by:

`Limit = 20000 × N² / ((N² + 50²) × C × P)`

The influence budget is shared among categories and platforms. The squared field-size factor makes the limit much tighter for sparse boards: the factor is about 0.04% with one opponent, 3.85% with ten, and 85% with 119. Fifty opponents give half the asymptotic budget. The constants 20000 and 50 are explicit tuning parameters for this model, not standard Elo constants.

Use `BaseWeight = min(depthWeight, Limit × 0.05 / ((400 / ln(10)) × N))`. Because each opponent's absolute `actual − expected` score is at most 1, this guarantees each PB's signed contribution is no larger than its limit in either direction. Further exposure reduction can only tighten the bound. Both platforms split the category budget; combined absolute contributions are bounded by their shared allocation.

These weights are applied before fitting ratings and calculating expected scores. Indicators are not clipped afterward. A weak result in a small field therefore has limited influence on overall ability, while deep competitive fields retain more influence. This bounds attribution, not the exact counterfactual rating change caused by removing a run.

## Placement and diminishing evidence

For each runner use their current competition rank r on that platform board, including tied ranks (1, 1, 3). Their placement factor is `1 / sqrt(r)`: WR 1, fourth place 0.5, twenty-fifth 0.2. Each pair's placement weight is the mean of both factors: `Placement(i,j) = (1 / sqrt(r[i]) + 1 / sqrt(r[j])) / 2`. Multiply the bounded base board weight by this factor before fitting. This distinguishes exceptional finishes from high percentiles in large fields and reduces the influence of comparisons between weaker placements. A loss against a top runner retains more influence. The field-size rule still suppresses WRs in sparse boards.

Calculate each runner's exposure E as the sum of these placement-adjusted base weights against all opponents on all their comparable boards. For a pair of runners i and j, the final comparison weight is `BaseWeight * Placement(i,j) / sqrt(1 + (E[i] + E[j]) / 2)`.

Exposure depends on participation, field weights, and board placements. Both runners share the pair's weight, applied equally to wins, draws, and losses. Extra evidence grows sublinearly. These weights are part of the logistic fit itself; there is no post-fit score adjustment or runner-specific bonus. Since placement factors are at most 1, the field-dependent absolute contribution bounds still hold. Reversing an entire board changes its placement weights; it need not mirror the old ratings, because elite placements intentionally have more influence than lower ones.

Use the identical pair weights to calculate every PB's signed `actual - expected` evidence. Multiplying by `(400 / ln(10)) / 0.05` produces contributions whose sum matches fitted rating minus 1500 within solver tolerance. This preserves consistency between opponent estimates, ranking, and run indicators.

## Display and limitations

- Overall rank uses displayed integer ratings and competition ranking (1, 1, 3). Time-based leaderboard ranks are unchanged.
- No opponents: Unrated, no overall rank. Fewer than three comparable boards or five unique opponents: Provisional. These are evidence thresholds, not statistical confidence intervals.
- Disconnected fields are anchored to the same prior, but their relative strength cannot be established from results. Comparison-group ID and size are available in rating tooltips.
- The dedicated Elo tab lists runners by descending overall rating, with unrated runners last. Search preserves global ranks. The Runners directory has no rating columns or sorting controls. Profiles show overall rating and rank only in their Elo tab beside Run history, with all comparable verified PB contributions listed by points, including negative and zero contributions. Slower history and pending runs are excluded. Lists paginate at 25 rows; filters affect the contribution list without changing global rating or rank.
- The Elo toolbar has a How this works button that opens the explanation and formulas in a dialog. It has no runner-count label; pagination shows page numbers. Both run columns display current board rank and the recorded hardware label rather than the combined platform-board name. A latest historical run outside the selected PB board displays Unranked; its date remains available in run details.
- Strongest run is the comparable verified PB with the greatest signed contribution, using unrounded fitted strengths to calculate expected score. Equal contributions resolve in deterministic board/platform order. When no comparable boards exist, display the first PB in that order without implying a rating.
- Run points are a snapshot attribution, not a historical award or the counterfactual change from removing a run. Convert each PB's weighted `(actual - expected)` sum into Elo units by multiplying by `(400 / ln(10)) / 0.05`. The signed contributions partition the fitted score minus its 1500 baseline within solver tolerance. Display signed integer points beside the strongest and latest runs; independently rounded contributions may differ from the rounded total. Non-PB historical runs and singleton boards contribute zero.
- Latest run is the most recent verified run by recorded run date, including slower historical runs. Dated runs precede undated runs; equal or unknown dates resolve by run ID. Submission and verification dates are not substitutes.
- Elo search and profile filters never recalculate a subset rating.
- Cache keys include the effective PB's runner, board, board type, platform board, and integer time. Verification, rejection, removal, renaming, and PB improvements invalidate the snapshot when relevant. Slower histories and pending submissions do not change ratings.
- Adding or removing comparable boards changes group weights and may change ratings elsewhere. Scores measure performance relative to the current community, not an absolute time standard.

## Local run recommendations

The Elo page has a **Find my next run** button beside **How this works** on the right, with runner search on the left. It opens personal recommendations with no runner, board-type or platform selectors and considers all eligible boards automatically. `currentEloRecommendationRunner()` supplies Volpey as the temporary signed-in identity for the local trial; registrations must replace this with the authenticated runner identity. If that runner has no comparable PBs, show an empty state rather than using someone else's results. Every estimated overall rank uses the full community. Recommendations are not shown in profile tabs.

- Existing PBs: try beating the next distinct faster or tied time, plus a stretch target improving the current board rank by `ceil(rank * 0.2)` places (at least one). For opponent times of at least one minute, use the largest whole-second time strictly faster than that opponent: `ceil(timeMs / 1000) * 1000 - 1000`. Shorter targets beat the opponent by one millisecond. Recompute the target rank from that exact goal; duplicate and nonpositive targets are excluded. Longer current PBs also display without milliseconds in the recommendation table. A current solo WR has no improvement candidate because a faster time without changed comparisons does not change rating evidence.
- New boards: require at least two comparable PBs in the same board type (full game or levels) and platform group. Compute the median of `(rank - 1) / (fieldSize - 1)` on those boards and use that percentile to choose a target in the new board's field. Do not transfer evidence between board types or platform groups. This is a target-selection heuristic, not a prediction of achievable times or practice effort.
- Each scenario replaces only that runner's history on the target category/platform in a temporary snapshot with one hypothetical verified PB. Refit the complete global model, including opponents, field size, placements, budgets and exposure, then apply rounded competition ranks. The baseline strengths can initialize the solver to reduce calculation time; its objective and tolerance are unchanged. Published run contributions are not used as an estimate of the gain.
- Keep only positive displayed rating gains, choose the highest-gain target per category/platform (prefer the slower target for equal gain), and show at most five boards ordered by gain. These are the best among the tested targets, not an exhaustive search over all possible times. Rank may remain unchanged despite gaining Elo. Every estimate starts independently from the same baseline; gains cannot be added together.
- A browser worker calculates targets with progress and cancellation. Closing the dialog or opening another modal terminates active calculations. Stale results are ignored. Calculation failures allow retry. No result or hypothetical run is stored in localStorage or sent to a server. Community changes invalidate these estimates.

The imported fixture and locally verified browser submissions supply the inputs. Nothing is sent to a server. The scale, prior, and weighting are initial tuning choices; change the algorithm version when changing their meaning.
