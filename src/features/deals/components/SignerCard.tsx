import { UtilsService } from "@/services/utils.service";
import type { DealStatus, Signatory, SignerStatus } from "@/types/types";
import { CheckCircle2, Eye, Hourglass, X } from "lucide-react";

interface SignerCardProps {
  signer: Signatory;
  dealStatus: DealStatus;
  onRemove?: (signerId: string) => Promise<void>;
  onClick?: (signerId: string) => void;
  canRemove?: boolean;
  isLoading?: boolean;
  isSelected?: boolean;
}

export const SignerCard: React.FC<SignerCardProps> = ({
  signer,
  dealStatus,
  onRemove,
  onClick,
  canRemove = true,
  isLoading = false,
  isSelected = false,
}) => {
  const getSignerStatus = (status: SignerStatus) => {
    switch (status) {
      case 'waiting':
        return (
          <div data-tip="Aguardando assinatura" className="tooltip bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 px-2 py-1 rounded-md border border-amber-200">
            <Hourglass className="w-4 h-4" />
          </div>);
      case 'signed':
        return (
          <div data-tip="Assinado" className="tooltip bg-gradient-to-r from-green-100 to-green-50 text-green-700 px-2 py-1 rounded-md border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
          </div>);
      case 'rejected':
        return (
          <div data-tip="Rejeitado" className="tooltip bg-gradient-to-r from-red-100 to-red-50 text-red-700 px-2 py-1 rounded-md border border-red-200">
            <X className="w-4 h-4" />
          </div>);
      case 'cancelled':
        return (
          <div data-tip="Cancelado" className="tooltip bg-gradient-to-r from-red-100 to-red-50 text-red-700 px-2 py-1 rounded-md border border-red-200">
            <X className="w-4 h-4" />
          </div>);
      case 'read':
        return (
          <div data-tip="Visualizado" className="tooltip bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-200">
            <Eye className="w-4 h-4" />
          </div>);
      default:
        return null;
    }
  }

  return (
    <div
      onClick={() => onClick?.(signer.id)}
      className={`bg-white rounded-xl border p-4 shadow-sm relative group transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-blue-50/30' : 'border-slate-200'} ${onClick ? 'cursor-pointer hover:bg-slate-50 hover:border-primary/30 hover:shadow-md' : ''}`}
    >
      {canRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(signer.id);
          }}
          disabled={!onRemove || !canRemove || isLoading}
          className="cursor-pointer absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <span className="loading loading-spinner loading-sm w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      )}

      <div className="flex items-center justify-between">
        <div className="separator">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-bold text-slate-800 text-lg">{signer.name}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${UtilsService.getSignerBadge(signer.role).color}`}>
              {UtilsService.getSignerBadge(signer.role).label}
            </span>
          </div>
          <div className="text-slate-500 text-sm space-y-0.5">
            <p>{signer.email}</p>
            <p>{signer.phoneNumber}</p>
          </div>
        </div>

        {signer.status && dealStatus !== 'DRAFT' && (
          <div>
            {getSignerStatus(signer.status)}
          </div>
        )}
      </div>
    </div>
  );
};