import html2pdf from 'html2pdf.js'
import { Trade } from '../types/trade'
import { getTruePnL } from './tradeUtils'

export interface ExportPDFData {
  title: string
  subtitle?: string
  trades: Trade[]
  totalTrades: number
  netPnL: number
  totalProfit: number
  totalLoss: number
  profitRate: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function generateReportDOM(data: ExportPDFData): HTMLElement {
  const container = document.createElement('div')
  // We use standard web fonts and highly specific coloring to match the premium dark theme, but adapted slightly for print clarity if needed (though the user wants a beautiful, similar visual feel, so we'll stick to deep nice colors)
  container.style.cssText = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    background-color: #f8fafc;
    width: 800px; /* Fixed width for A4 aspect ratio rendering */
  `

  // --- HTML TEMPLATE GENERATION ---
  
  // 1. Header (Cover-like)
  const headerHtml = `
    <div style="padding: 40px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; border-bottom: 4px solid #10b981;">
      <h1 style="margin: 0; font-size: 36px; font-weight: 800; letter-spacing: -0.02em;">${data.title}</h1>
      <p style="margin: 8px 0 0 0; font-size: 18px; color: #94a3b8; font-weight: 500;">${data.subtitle || ''}</p>
      <div style="margin-top: 24px; display: inline-block; padding: 6px 12px; background: rgba(255,255,255,0.1); border-radius: 6px; font-size: 12px; color: #cbd5e1;">
        Generated automatically on ${new Date().toLocaleString()}
      </div>
    </div>
  `

  // 2. Summary Section
  const summaryHtml = `
    <div style="padding: 30px 40px;">
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #334155; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Performance Summary</h2>
      <div style="display: flex; gap: 20px;">
        <div style="flex: 1; padding: 20px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-top: 4px solid ${data.netPnL >= 0 ? '#10b981' : '#ef4444'};">
          <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Net P&L</div>
          <div style="font-size: 28px; font-weight: 800; color: ${data.netPnL >= 0 ? '#10b981' : '#ef4444'}; margin-top: 4px;">${formatCurrency(data.netPnL)}</div>
        </div>
        <div style="flex: 1; padding: 20px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-top: 4px solid #3b82f6;">
          <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Profit Rate</div>
          <div style="font-size: 28px; font-weight: 800; color: #3b82f6; margin-top: 4px;">${data.profitRate.toFixed(1)}%</div>
        </div>
        <div style="flex: 1; padding: 20px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-top: 4px solid #8b5cf6;">
          <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Total Trades</div>
          <div style="font-size: 28px; font-weight: 800; color: #8b5cf6; margin-top: 4px;">${data.totalTrades}</div>
        </div>
      </div>
      
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div style="flex: 1; padding: 16px 20px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
          <div style="font-size: 12px; color: #166534; font-weight: 600; text-transform: uppercase;">Gross Profit</div>
          <div style="font-size: 20px; font-weight: 700; color: #15803d; margin-top: 2px;">${formatCurrency(data.totalProfit)}</div>
        </div>
        <div style="flex: 1; padding: 16px 20px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
          <div style="font-size: 12px; color: #991b1b; font-weight: 600; text-transform: uppercase;">Gross Loss</div>
          <div style="font-size: 20px; font-weight: 700; color: #b91c1c; margin-top: 2px;">${formatCurrency(data.totalLoss)}</div>
        </div>
      </div>
    </div>
  `

  // 3. Trade Details Section (Iterate & apply page breaks intelligently)
  let tradesHtml = `
    <div style="padding: 0 40px 30px 40px;">
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #334155; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Trade Details</h2>
  `

  if (data.trades.length === 0) {
    tradesHtml += `<p style="color: #64748b;">No trades recorded in this period.</p>`
  } else {
    data.trades.forEach((trade) => {
      const pnl = getTruePnL(trade)
      const isWin = pnl >= 0
      const color = isWin ? '#10b981' : '#ef4444'

      // Important: Use html2pdf__page-break class for smart pagination. We put it on trade items so they don't break in half.
      // We don't want a break before the very first trade. We use avoid to keep the card intact.
      tradesHtml += `
        <div style="page-break-inside: avoid; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); border-left: 6px solid ${color};">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px; font-weight: 800; color: #0f172a;">${trade.pair}</span>
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; background: ${trade.direction === 'Long' ? '#ecfdf5' : '#fef2f2'}; color: ${trade.direction === 'Long' ? '#10b981' : '#ef4444'};">
                  ${trade.direction}
                </span>
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: #f1f5f9; color: #475569;">
                  ${trade.account}
                </span>
              </div>
              <div style="font-size: 13px; color: #64748b; margin-top: 6px;">
                ${trade.date} ${trade.time ? '• ' + trade.time : ''} ${trade.session ? '• ' + trade.session : ''}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 24px; font-weight: 800; color: ${color};">
                ${isWin ? '+' : ''}${formatCurrency(pnl)}
              </div>
              <div style="font-size: 13px; color: #64748b; font-weight: 600; margin-top: 4px;">
                ${trade.result}
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 16px; margin-bottom: 20px;">
            <div style="flex: 1; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
              <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Entry</div>
              <div style="font-size: 14px; font-weight: 600; color: #334155;">${trade.entryPrice || '-'}</div>
            </div>
            <div style="flex: 1; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
              <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Stop Loss</div>
              <div style="font-size: 14px; font-weight: 600; color: #334155;">${trade.stopLoss || '-'}</div>
            </div>
            <div style="flex: 1; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
              <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Take Profit</div>
              <div style="font-size: 14px; font-weight: 600; color: #334155;">${trade.takeProfit || '-'}</div>
            </div>
            <div style="flex: 1; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
              <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Exit</div>
              <div style="font-size: 14px; font-weight: 600; color: #334155;">${trade.exitPrice || '-'}</div>
            </div>
            <div style="flex: 1; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
              <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">R:R</div>
              <div style="font-size: 14px; font-weight: 600; color: #334155;">${trade.riskReward != null ? Number(trade.riskReward).toFixed(2) : '-'}</div>
            </div>
          </div>

          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Emotions / Mistakes</div>
                <div style="font-size: 14px; color: #334155; line-height: 1.5; white-space: pre-wrap;">${trade.emotions || trade.mistakes ? '' : 'No emotions or mistakes recorded.'}</div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${trade.tradeAnalysis ? `<div><div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Analysis</div><div style="font-size: 14px; color: #475569;">${trade.tradeAnalysis}</div></div>` : ''}
                ${trade.mistakes ? `<div><div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Mistakes</div><div style="font-size: 14px; color: #475569;">${trade.mistakes}</div></div>` : ''}
                ${trade.emotions ? `<div><div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Emotions</div><div style="font-size: 14px; color: #475569;">${trade.emotions}</div></div>` : ''}
              </div>
            </div>
          </div>
      `

      // Images rendering
      const hasAnalysisImages = trade.analysisImages && trade.analysisImages.length > 0
      const hasResultImages = trade.resultImages && trade.resultImages.length > 0

      if (hasAnalysisImages || hasResultImages) {
        tradesHtml += `<div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">`
        
        if (hasAnalysisImages && trade.analysisImages) {
          tradesHtml += `<div>
            <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Analysis Images</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${trade.analysisImages.map(img => `<img src="${img}" style="width: 100%; max-height: 200px; object-fit: contain; background: #0f172a; border-radius: 8px;" />`).join('')}
            </div>
          </div>`
        }

        if (hasResultImages && trade.resultImages) {
          tradesHtml += `<div>
            <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Result Images</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${trade.resultImages.map(img => `<img src="${img}" style="width: 100%; max-height: 200px; object-fit: contain; background: #0f172a; border-radius: 8px;" />`).join('')}
            </div>
          </div>`
        }

        tradesHtml += `</div>`
      }

      tradesHtml += `</div>` // end trade block
    })
  }

  tradesHtml += `</div>` // end trades section

  container.innerHTML = headerHtml + summaryHtml + tradesHtml

  return container
}

export async function generatePDFReport(exportData: ExportPDFData, fileName: string): Promise<void> {
  const element = generateReportDOM(exportData)
  // We do NOT inject this directly into the body with top: -9999px because 
  // html2canvas inherently inherits that bounds translation, causing it to render blank out-of-bounds pages.
  // html2pdf explicitly natively accepts unattached elements and handles their layout isolation.
  
  const opt = {
    margin:       [0.4, 0, 0.4, 0] as [number, number, number, number], // Safe top/bottom rendering bleed
    filename:     fileName,
    image:        { type: 'jpeg' as const, quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, letterRendering: true, windowWidth: 800 },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const },
    pagebreak:    { mode: ['css', 'legacy'] }
  };

  try {
    // Await the generation process securely
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error('PDF Generation Failed', err)
    throw err
  }
}
