import Container from '@mui/material/Container'
import AppBar from '~/components/AppBar/AppBar.jsx'
import BoardBar from './BoardBar/BoardBar.jsx'
import BoardContent from './BoardContent/BoardContent.jsx'
import { useEffect, useState } from 'react'
import {
  createNewCardAPI,
  createNewColumnAPI,
  deleteColumnDetailsAPI,
  fetchBoardDetailsAPI,
  moveCardToDifferentColumnAPI,
  updateBoardDetailsAPI,
  updateColumnDetailsAPI
} from '~/apis/index.js'
import { isEmpty } from 'lodash'
import { generatePlaceholderCard } from '~/utils/formatters.js'
import { mapOrder } from '~/utils/sorts'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { toast } from 'react-toastify'

function Board() {
  const [board, setBoard] = useState(null)

  useEffect(() => {
    const boardId = '66c8addd92cb08f8a10b6b24'

    fetchBoardDetailsAPI(boardId).then(board => {
      // sắp xếp trước ở đây
      board.columns = mapOrder(board.columns, board.columnOrderIds, '_id')
      // xử lý vấn đề kéo thả column rỗng
      board.columns.forEach(column => {
        if (isEmpty(column.cards)) {
          column.cards = [generatePlaceholderCard(column)]
          column.cardOrderIds = [generatePlaceholderCard(column)._id]
        } else {
          column.cards = mapOrder(column.cards, column.cardOrderIds, '_id')
        }
      })
      setBoard(board)
    })
  }, [])

  const createNewColumn = async (newColumnData) => {
    const createColumn = await createNewColumnAPI({
      ...newColumnData,
      boardId: board._id
    })

    createColumn.cards = [generatePlaceholderCard(createColumn)]
    createColumn.cardOrderIds = [generatePlaceholderCard(createColumn)._id]
    // cập nhật state board
    // phía front-end chúng ta phải tự làm đúng lại state data board (thay vì phải gọi lại api fetchBoardDetailsAPI)
    // cách làm này phụ thuộc vào đặc thù của dự án, có nơi backend sẽ hỗ trợ trả về luôn
    const newBoard = { ...board }
    newBoard.columns.push(createColumn)
    newBoard.columnOrderIds.push(createColumn._id)
    setBoard(newBoard)
  }

  const createNewCard = async (newCardData) => {
    const createCard = await createNewCardAPI({
      ...newCardData,
      boardId: board._id
    })
    const newBoard = { ...board }
    const columnToUpdate = newBoard.columns.find(column => column._id === createCard.columnId)
    if ( columnToUpdate ) {
      if (columnToUpdate.cards.some(card => card.FE_PlaceholderCard)) {
        columnToUpdate.cards= [createCard]
        columnToUpdate.cardOrderIds = [createCard._id]
      } else {
        columnToUpdate.cards.push(createCard)
        columnToUpdate.cardOrderIds.push(createCard._id)
      }
    }

    setBoard(newBoard)
  }

  // chỉ cần gọi API để cập nhật mảng columnOrderIds của Board chứa nó (thay đổi vị trí trong mảng)
  const moveColumns = async (dndOrderedColumns) => {
    const dndOrderedColumnIds = dndOrderedColumns.map(c => c._id)
    const newBoard = { ...board }
    newBoard.columns = dndOrderedColumns
    newBoard.columnOrderIds = dndOrderedColumnIds
    setBoard(newBoard)

    await updateBoardDetailsAPI(newBoard._id, { columnOrderIds: dndOrderedColumnIds })
  }

  // khi di chuyển card trong cùng column
  // chỉ cần gọi API để cập nhật mảng cardOrderIds của column chứa nó (thay đổi vị trí trong mảng)
  const moveCardInTheSameColumn = (dndOrderedCards, dndOrderedCardIds, columnId) => {
    const newBoard = { ...board }
    const columnToUpdate = newBoard.columns.find(column => column._id === columnId)
    if ( columnToUpdate ) {
      columnToUpdate.cards = dndOrderedCards
      columnToUpdate.cardOrderIds = dndOrderedCardIds
    }
    setBoard(newBoard)

    updateColumnDetailsAPI(columnId, { cardOrderIds: dndOrderedCardIds })
  }

  /**
   * Khi di chuyển card sáng Column khác:
   * B1: Cập nhật mảng cardOrderIds của Column ban đầu chứa nó (Hiểu bản chất là xóa cái _id của Card ra khỏi mảng)
   * B2: Cập nhật mảng cardOrderIds của Column tiếp theo (thêm _id vào Card của mảng)
   * B3: Cập nhật lại trường CloumnId mới của cái Card đã kéo
   * => Làm 1 API support riêng.
   */
  const moveCardToDifferentColumn = (currentCardId, prevColumnId, nextColumnId, dndOrderedColumns) => {
    const dndOrderedColumnIds = dndOrderedColumns.map(c => c._id)
    const newBoard = { ...board }
    newBoard.columns = dndOrderedColumns
    newBoard.columnOrderIds = dndOrderedColumnIds
    setBoard(newBoard)

    let prevCardOrderIds = dndOrderedColumns.find(c => c._id === prevColumnId)?.cardOrderIds
    if (prevCardOrderIds[0].includes('placeholder-card')) prevCardOrderIds = []

    moveCardToDifferentColumnAPI({
      currentCardId,
      prevColumnId,
      prevCardOrderIds,
      nextColumnId,
      nextCardOrderIds: dndOrderedColumns.find(c => c._id === nextColumnId)?.cardOrderIds
    })
  }

  const deleteColumnDetails = (columnId) => {
    const newBoard = { ...board }
    newBoard.columns = newBoard.columns.filter(c => c._id !== columnId)
    newBoard.columnOrderIds = newBoard.columnOrderIds.filter(_id => _id !== columnId)
    setBoard(newBoard)
    deleteColumnDetailsAPI(columnId).then(res => {
      toast.success(res?.deleteResult)
    })
  }

  if (!board) {
    return (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        width: '100vw',
        height: '100vh'
      }}>
        <CircularProgress />
        <Typography>Loading Board...</Typography>
      </Box>
    )
  }

  return (
    <Container disableGutters maxWidth={false} sx={{ height: '100vh' }}>
      <AppBar />
      <BoardBar board={board}/>
      <BoardContent
        createNewColumn={createNewColumn}
        createNewCard={createNewCard}
        moveColumns = {moveColumns}
        moveCardInTheSameColumn = {moveCardInTheSameColumn}
        moveCardToDifferentColumn = {moveCardToDifferentColumn}
        deleteColumnDetails = {deleteColumnDetails}
        board={board}
      />
    </Container>
  )
}

export default Board
