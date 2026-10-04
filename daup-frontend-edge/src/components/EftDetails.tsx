import {
  EFT_BANK_LABEL,
  EFT_BRANCH_LABEL,
  EFT_HOLDER_LABEL,
  EFT_NUMBER_LABEL,
  EFT_REFERENCE_LABEL,
  EFT_TYPE_LABEL
} from '../hub/copy';
import { EFT_PAYEE } from '../hub/placeSubscription';

/** Bank details only. No card field, and nothing here marks the place paid. */
export function EftDetails({
  amountLine,
  reference,
  testId = 'place-eft'
}: {
  amountLine: string;
  reference?: string;
  testId?: string;
}) {
  const ref = (reference || '').trim();
  return (
    <div className="place-eft" data-testid={testId}>
      <p className="place-sub-quote" data-testid={`${testId}-amount`}>{amountLine}</p>
      <dl>
        <div>
          <dt>{EFT_BANK_LABEL}</dt>
          <dd>{EFT_PAYEE.bank}</dd>
        </div>
        <div>
          <dt>{EFT_HOLDER_LABEL}</dt>
          <dd>{EFT_PAYEE.accountHolder}</dd>
        </div>
        <div>
          <dt>{EFT_TYPE_LABEL}</dt>
          <dd>{EFT_PAYEE.accountType}</dd>
        </div>
        <div>
          <dt>{EFT_NUMBER_LABEL}</dt>
          <dd>{EFT_PAYEE.accountNumber}</dd>
        </div>
        <div>
          <dt>{EFT_BRANCH_LABEL}</dt>
          <dd>{EFT_PAYEE.branchCode}</dd>
        </div>
      </dl>
      {ref ? (
        <p data-testid={`${testId}-reference`}>{EFT_REFERENCE_LABEL} {ref}</p>
      ) : null}
    </div>
  );
}
