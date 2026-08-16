import { DEMENTIA_RISK_META, DementiaRiskResult, dementiaRiskHeadline } from "@/lib/dementiaRisk";

interface DementiaRiskCardProps {
  result: DementiaRiskResult | null;
}

const TIER_STYLES = {
  low: "bg-neutral-50 text-muted",
  moderate: "bg-accent-soft text-foreground",
  elevated: "bg-accent-soft text-foreground",
} as const;

export default function DementiaRiskCard({ result }: DementiaRiskCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Estimated dementia risk
      </p>

      {result ? (
        <>
          <div className={`rounded-xl p-4 text-sm leading-relaxed ${TIER_STYLES[result.tier]}`}>
            <p className="font-medium text-foreground mb-1">
              {result.percent}% — {result.tier === "low" ? "Low" : result.tier === "moderate" ? "Moderate" : "Elevated"} pattern match
            </p>
            <p>{dementiaRiskHeadline(result.tier)}</p>
            {result.tier === "elevated" && (
              <p className="mt-2 font-medium text-foreground">
                We&apos;d recommend getting this checked out by a doctor.
              </p>
            )}
          </div>
          <p className="text-xs text-muted">
            Based on {result.availableFeatures} of {result.totalFeatures} speech measurements from
            this recording.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">
          Not enough measurements from this recording to estimate this — it needs either a
          transcript or clear pitch tracking, alongside the pause and timing data.
        </p>
      )}

      <p className="text-sm leading-relaxed text-muted">
        This percentage comes from a model built for this project (a hackathon build, not a
        medical product), trained on synthetic data shaped by published dementia-speech research
        rather than real diagnosed patients — see the code for exactly how. It&apos;s a similarity
        score against two reference speech profiles, computed as if dementia and non-dementia were
        equally likely going in — it is not adjusted for how rare dementia actually is in the
        population, so it is not the same number as &quot;your probability of having
        dementia.&quot; On its own synthetic test data it got the direction right about{" "}
        {Math.round(DEMENTIA_RISK_META.holdoutAccuracy * 100)}% of the time, which is not the same
        as being validated on real people. It is not a diagnosis, not a clinical screening tool,
        and not from a doctor, and it can be wrong in both directions. If you&apos;re ever
        genuinely concerned about your memory or thinking, talk to a doctor — that&apos;s the only
        reliable way to check.
      </p>
    </div>
  );
}
