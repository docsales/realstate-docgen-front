import React, { createContext, useState, useEffect, type ReactNode, useContext } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { settingsService } from '@/services/settings.service';
import { webhooksService } from '@/services/webhooks.service';
import type { DocumentTemplate, WebhookToken } from '@/types/settings.types';
import { Button } from '@/components/Button';

export interface ConfigNotificationContextType {
  missingConfigs: string[];
  isLoading: boolean;
  recheck: () => Promise<void>;
}

export const ConfigNotificationContext = createContext<ConfigNotificationContextType | undefined>(undefined);

export const ConfigNotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [missingConfigs, setMissingConfigs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  const checkConfigurations = async () => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const missing: string[] = [];

    try {
      // Check Account Settings (API key / folder / email default)
      try {
        const account = await settingsService.getAccount();
        if (!account.docsalesApiKey || account.docsalesApiKey.trim() === '') missing.push('DocSales API Key');
        if (!account.folderId || account.folderId.trim() === '') missing.push('Folder ID');
        if (!account.defaultDocsalesUserEmail || account.defaultDocsalesUserEmail.trim() === '') missing.push('Email do DocSales');
      } catch (error) {
        console.error('Erro ao verificar configurações do usuário:', error);
        missing.push('DocSales API Key');
        missing.push('Folder ID');
        missing.push('Email do DocSales');
      }

      // Check Templates
      try {
        const templates = await settingsService.getDocumentTemplates();
        const hasActiveTemplate = templates.some((t: DocumentTemplate) => t.isActive);
        if (!hasActiveTemplate || templates.length === 0) {
          missing.push('Template de Documento');
        }
      } catch (error) {
        console.error('Erro ao verificar templates:', error);
        missing.push('Template de Documento');
      }

      // Check Webhooks
      try {
        const tokens = await webhooksService.getTokens();
        const hasActiveToken = tokens.some((t: WebhookToken) => t.isActive);
        if (!hasActiveToken || tokens.length === 0) {
          missing.push('Webhook');
        }
      } catch (error) {
        console.error('Erro ao verificar webhooks:', error);
        missing.push('Webhook');
      }

      setMissingConfigs(missing);
    } catch (error) {
      console.error('Erro ao verificar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConfigurations();
  }, [isAuthenticated, user?.id]);

  const recheck = async () => {
    setIsDismissed(false);
    await checkConfigurations();
  };

  const shouldShowBanner = !isLoading && missingConfigs.length > 0 && !isDismissed;

  return (
    <ConfigNotificationContext.Provider
      value={{
        missingConfigs,
        isLoading,
        recheck,
      }}
    >
      {shouldShowBanner && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-yellow-900 mb-1">
                  Configurações Pendentes
                </p>
                <p className="text-sm text-yellow-800">
                  Para utilizar todas as funcionalidades, complete as seguintes configurações:{' '}
                  <span className="font-semibold">
                    {missingConfigs.join(', ')}
                  </span>
                  .{' '}
                  <Link
                    to="/settings"
                    className="underline hover:text-yellow-900 font-semibold"
                  >
                    Ir para Configurações
                  </Link>
                </p>
              </div>
              <Button
                variant="ghost"
                icon={<X className="w-3.5 h-3.5" />}
                size="sm"
                onClick={() => setIsDismissed(true)}
                className="tooltip tooltip-left text-yellow-600 hover:text-yellow-800 transition-colors"
                data-tip="Dispensar"
              />
            </div>
          </div>
        </div>
      )}
      {children}
    </ConfigNotificationContext.Provider>
  );
};

export const useConfigNotification = () => {
  const context = useContext(ConfigNotificationContext);
  if (context === undefined) {
    throw new Error('useConfigNotification must be used within a ConfigNotificationProvider');
  }
  return context;
};
