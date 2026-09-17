import { Invoice, Client, Business, AppSettings } from '@/store/useStore';
import { RenderModel } from '../types/renderModel';
import { DocumentRenderer } from './DocumentRenderer';

export type PipelineMiddleware = (model: RenderModel) => RenderModel;

export class RenderPipeline {
  private middlewares: PipelineMiddleware[] = [];

  /**
   * Registers a middleware step that can mutate or enhance the RenderModel before final layout.
   */
  public use(middleware: PipelineMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Executes the entire rendering pipeline for a document.
   */
  public execute(
    document: Invoice | Omit<Invoice, 'id'>,
    client: Client,
    business: Business,
    settings: AppSettings,
    overrideTemplateId?: string
  ): RenderModel {
    // 1. Initial RenderModel generation
    let model = DocumentRenderer.render(document, client, business, settings, overrideTemplateId);

    // 2. Execute any registered pipeline plugins/middlewares sequentially
    for (const middleware of this.middlewares) {
      try {
        model = middleware(model);
      } catch (err) {
        console.error('Error running document rendering middleware:', err);
      }
    }

    return model;
  }
}

export const renderPipeline = new RenderPipeline();
export default renderPipeline;
