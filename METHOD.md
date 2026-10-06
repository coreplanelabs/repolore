# Award definitions

All timestamps come from GitHub records. The 90-day interval is inclusive of its
start and ends at the read's starting instant. Later merges are excluded. Time
is calendar time, including nights, weekends and draft periods.

## Reading scope

The closed listing is one page of 100 PRs ordered by `updated` descending.
Only records with a non-null `merged_at` inside the window count as merges.
The window is complete only when the listing returns fewer than 100 records,
or its oldest update precedes the window start, with valid ordered records and
no exclusions. Otherwise the result remains a sample. A closed PR is not assumed
merged. PRs whose required fields cannot be parsed are excluded visibly.

The ten most recently merged observed PRs are selected for detailed counts.
Detail number, author ID, merge timestamp and head SHA must match the listing.
Changed bindings and unreadable counts are excluded. Awards name the largest
value among inspected records, not all PRs in the repository.

## Six awards

| Award | Exact fact |
| --- | --- |
| Merge Machine | PR author ID with the most observed merges. Bot accounts are included. Ties are disclosed; account login breaks the display tie. This is not merge-button activity. |
| Delete Club | Inspected PR with the largest positive `deletions` count. The card also shows `additions`; it does not claim net shrinkage. All file types count. PR number breaks equal-value display ties. |
| Comment Magnet | Inspected PR with the largest positive `review_comments` count. These are inline review comments, not all discussion comments, negative sentiment, or defects. |
| The Cast | Number of distinct identified author IDs among observed merged PRs. Bots count. Deleted/unidentified authors do not count. This does not identify newcomers or external contributors. |
| The Long Goodbye | Earliest `created_at` from GitHub's oldest-first open-PR listing. Drafts are included and identified. Calendar age is not review waiting time. Any unreadable open record makes this award unknown. |
| Fastest Lap | Shortest nonnegative opening-to-merge interval among observed merges. It includes waiting, draft time and automation; it is not engineering effort or deployment lead time. |

Missing evidence is unknown. A fully read scope with no positive award value is
empty. Zero comments or no recorded deletions does not mean perfect code. Returned
author names, coauthor prose, titles and bot identities cannot establish AI use.

## Contribution guidance

The community-profile endpoint may provide a contribution-guide URL. The app
accepts only a HTTPS github.com URL bound to this repository. It does not parse
prose into an authoritative open/closed policy. With no verified guide link, the
app links the repository's documentation and says the policy is unknown.

## Sharing and replay

Text, JSON and the page use one typed report. JSON retains the normalized input
facts; offline replay rebuilds the awards instead of trusting saved captions or
links. A selected evidence file is local input, not fresh provider verification.
The PNG includes read date, repository, observed merge count and inspected-diff
count. A page URL reruns a repository and can produce a different later snapshot.

The application performs public reads only. It has no email collection, global
rankings, fake events, sentiment classifier, telemetry, or repository mutations.
