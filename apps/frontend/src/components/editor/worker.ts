import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker"
import YamlWorker from '@/yaml.worker.js?worker'


export function registerWorkers() {
    self.MonacoEnvironment = {
        getWorker: (workerId, label) => {
            if (label === 'json') {
                return new JsonWorker();
            }
            if (label === 'yaml') {
                return new YamlWorker();
            }
            return new EditorWorker();
        }
    }
};