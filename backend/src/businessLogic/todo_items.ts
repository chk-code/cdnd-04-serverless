import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
import { Todos_Data_Access } from '../dataLayer/todos_access_aws'
import { CreateTodoRequest } from '../requests/CreateTodoRequest'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'
import * as uuid from 'uuid'

const todoDataAccess = new Todos_Data_Access()
const logger = createLogger('BUSINESS-LOGIC')

// GET Functions
export async function getTodoItems(userId: string): Promise<TodoItem[]> {
    logger.info("### Starting getTodoItems ###")
    logger.info("User Id "+ userId)
    logger.info("### End of getTodoItems ###")
    return await todoDataAccess.getTodosByUserId(userId)
}
// CREATE Functions
export async function createTodo(createTodoRequest: CreateTodoRequest, userId: string): Promise<TodoItem> {
    logger.info("### Starting createTodo ###")
    const newTodoId = uuid.v4()
    logger.info("### End of createTodo ###")
    return await todoDataAccess
        .createTodo({
            todoId: newTodoId,
            userId: userId,
            createdAt: new Date().toISOString(),
            name: createTodoRequest.name,
            dueDate: createTodoRequest.dueDate,
            done: false
        })
}
// UPDATE Functions
export async function updateTodo(todoId: string, userId: string, updateTodoRequest: UpdateTodoRequest): Promise<TodoItem> {
    logger.info("### Starting updateTodo ###")
    const element = {
        name: updateTodoRequest.name,
        dueDate: updateTodoRequest.dueDate,
        done: updateTodoRequest.done
    }
    logger.info("### End of updateTodo ###")
    return await todoDataAccess.updateTodo(todoId,userId,element) 
}
// DELETE Functions
export async function deleteTodo(todoId: string, userId: string): Promise<boolean> {
    logger.info("### Starting deleteTodoItem ###")

    logger.info("### End of deleteTodoItem ###")
    return await todoDataAccess.deleteTodo(todoId, userId)
}
// GENERATE Functions
export async function generateUploadUrl(todoId: string, userId: string, event: any): Promise<any> {
    logger.info("### Starting generateUploadUrl ###")
    const signedUrl = await todoDataAccess.getUploadUrl(todoId,event)
    logger.info("The signed URL is "+signedUrl)
    const resUpd = await todoDataAccess.updateTodoURL(todoId,userId)
 
    logger.info("### End of generateUploadUrl ###")
    return {updTodoItem: resUpd, uploadUrl: signedUrl} 
}