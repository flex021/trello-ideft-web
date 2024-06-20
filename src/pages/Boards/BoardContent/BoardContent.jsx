import Box from '@mui/material/Box'
import ListColumns from './ListColumns/ListColumns'
import { mapOrder } from '~/utils/sorts'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  DragOverlay,
  defaultDropAnimationSideEffects,
  closestCorners,
  pointerWithin,
  getFirstCollision
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useCallback, useEffect, useRef, useState } from 'react'
import Column from './ListColumns/Column/Column'
import Card from './ListColumns/Column/ListCards/Card/Card'
import { cloneDeep, isEmpty } from 'lodash'
import { generatePlaceholderCard } from '~/utils/formatters'

const ACTIVE_DRAG_ITEM_TYPE = {
  COLUMN: 'ACTIVE_DRAG_ITEM_TYPE_COLUMN',
  CARD: 'ACTIVE_DRAG_ITEM_TYPE_CARD'
}

function BoardContent({ board }) {

  //yêu cầu chuột di chuyển 10px thì mới kích hoạt handleDragEnd
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 10 } })

  //thằng pointerSensor bị bug nên sử dụng thg mouse (xài trên web)
  //thằng touch thì trên điện thoại, delay là ấn giữ 250ms thì mới kéo thả đc, tolerance: dung sai
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 10 } })

  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 500 } })

  const sensors = useSensors(mouseSensor, touchSensor)

  const [orderedColumns, setOreredColumns] = useState([])

  //cùng một thời điểm chỉ có một phần tử đang được kéo (column hoặc card)
  const [activeDragItemId, setActiveDragItemId] = useState(null)
  const [activeDragItemType, setActiveDragItemType] = useState(null)
  const [activeDragItemData, setActiveDragItemData] = useState(null)
  const [oldColumnWhenDraggingCard, setOldColumnWhenDraggingCard] = useState(null)

  // điểm va chạm cuối cùng (xử lý thuật toán phát hiện va chạm)
  const lastOverId = useRef(null)

  useEffect(() => {
    setOreredColumns(mapOrder(board?.columns, board?.columnOrderIds, '_id'))
  }, [board])

  // const orderedColumns = mapOrder(board?.columns, board?.columnOrderIds, '_id')

  const findColumnByCardId = (cardId) => {
    // nên dùng c.cards thay vì c.cardOrderIds bởi vì ở bước handleDragOver sẽ làm dữ liệu cho cards hoàn chỉnh trước rồi mới tạo cardOrderIds mới
    return orderedColumns.find(column => column?.cards?.map(card => card._id)?.includes(cardId))
  }

  // Function chung xử lý việc

  const handleDragStart = (event) => {
    setActiveDragItemId(event?.active?.id)
    setActiveDragItemType(event?.active?.data?.current?.columnId ? ACTIVE_DRAG_ITEM_TYPE.CARD : ACTIVE_DRAG_ITEM_TYPE.COLUMN)
    setActiveDragItemData(event?.active?.data?.current)

    // Nếu là kéo card thì mới thực hiện hành động set giá trị oldColumn
    if (event?.active?.data?.current?.columnId) {
      setOldColumnWhenDraggingCard(findColumnByCardId(event?.active?.id))
    }
  }

  const handleDragOver = (event) => {

    //không làm gì thêm khi đang kéo column
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) return

    //còn nếu kéo card thì xử lý thêm để có thể kéo card qua lại giữa các column
    const { active, over } = event

    //kiểm tra nếu không tồn tại over (kéo linh tinh ra ngoài thì return luôn, tránh lỗi)
    if (!active || !over) return

    // bóc tách
    const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
    const { id: overCardId } = over

    //tìm 2 cái column theo cardId
    const activeColumn = findColumnByCardId(activeDraggingCardId)
    const overColumn = findColumnByCardId(overCardId)

    if ( !activeColumn || !overColumn ) return

    //xử lý logic ở đây chỉ khi kéo card qua 2 column khác nhau, còn nếu kéo card trong chính column ban đầu thì không làm gì
    // Vì đây là đoạn xử lý lúc kéo (handleDragOver), còn xử lý lúc kéo xong thì nó lại là vấn đề khác ở (handleDragEnd)
    if (activeColumn._id !== overColumn._id) {
      setOreredColumns(preColumns => {
        // tìm vị trí index của cái overCard trong column đích (nơi card sắp được thả)
        const overCardIndex = overColumn?.cards?.findIndex(card => card._id === overCardId)
        // logic tính toán "cardIndex mới" (trên hoặc dưới của overCard) lấy chuẩn ra từ code của thư viện
        let newCardIndex
        const isBelowOverItem = active.rect.current.translated &&
              active.rect.current.translated.top > over.rect.top + over.rect.height
        const modifier = isBelowOverItem ? 1 : 0

        newCardIndex = overCardIndex >= 0 ? overCardIndex + modifier : overColumn?.cards?.length + 1
        // clone mảng orderedColumns state cũ ra một cái mới để xử lý data rồi return - cập nhật lại orderedColumns state mới
        const nextColumns = cloneDeep(preColumns)
        const nextActiveColumn = nextColumns.find(column => column._id === activeColumn._id)
        const nextOverColumn = nextColumns.find(column => column._id === overColumn._id)

        // nextActiveColumn: column cũ
        if (nextActiveColumn) {
          // xóa card ở cái column active (cũng có thể hiểu là cái column cũ, cái lúc mà kéo card ra khỏi nó để sang columnn khác)
          nextActiveColumn.cards = nextActiveColumn.cards.filter(card => card._id !== activeDraggingCardId)

          // Thêm placeholder Card nếu Column rỗng: Bị kéo hết Card đi, không còn cái nào nữa
          if (isEmpty(nextActiveColumn.cards)) {
            nextActiveColumn.cards = [generatePlaceholderCard(nextActiveColumn)]
          }

          // cập nhật lại mảng cardOrderIds cho chuẩn dữ liệu
          nextActiveColumn.cardOrderIds = nextActiveColumn.cards.map(card => card._id)
        }

        // nextOverColumn: Column mới
        if (nextOverColumn) {
          // kiểm tra xem card đang kéo nó có tồn tại ở overColumn chưa, nếu có thì cần xóa nó trước
          nextOverColumn.cards = nextOverColumn.cards.filter(card => card._id !== activeDraggingCardId)

          //Phải cập nhật lại chuẩn dữ liệu columnId trong card sau khi kéo card giữa 2 column khác nhau
          const rebuild_activeDraggingCardData = {
            ...activeDraggingCardData,
            columnId: nextOverColumn._id
          }

          // tiếp theo là thêm cái card đang kéo vào overColumn theo vị trí index mới
          nextOverColumn.cards = nextOverColumn.cards.toSpliced(newCardIndex, 0, rebuild_activeDraggingCardData)

          // Xóa cái placeholder đi nếu nó đang tồn tại (tối ưu cho back-end)
          nextOverColumn.cards = nextOverColumn.cards.filter(card => !card.FE_PlaceholderCard)

          // cập nhật lại mảng cardOrderIds cho chuẩn dữ liệu
          nextOverColumn.cardOrderIds = nextOverColumn.cards.map(card => card._id)
          console.log('column', nextColumns);
        }
        return nextColumns
      })
    }

  }

  const handleDragEnd = (event) => {
    // console.log('handleDragEnd', event)

    const { active, over } = event

    //kiểm tra nếu không tồn tại over (kéo linh tinh ra ngoài thì return luôn, tránh lỗi)
    if (!active || !over) return

    // Xử lý kéo thả Cards
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) {
      // bóc tách
      const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
      const { id: overCardId } = over

      //tìm 2 cái column theo cardId
      const activeColumn = findColumnByCardId(activeDraggingCardId)
      const overColumn = findColumnByCardId(overCardId)

      if ( !activeColumn || !overColumn ) return

      // Hành động kéo thả card giữa 2 column khác nhau
      // phải dùng tới activeDragItemData.columnId hoặc oldColumnWhenDraggingCard (set vào state từ bước handleDragStart) chứ không phải activeData trong scope handleDragEnd này vì sau khi đi qua onDragOver tới đây là state của card đã bị  cập nhật một lần nữa
      if (oldColumnWhenDraggingCard._id !== overColumn._id) {
        setOreredColumns(preColumns => {
          // tìm vị trí index của cái overCard trong column đích (nơi card sắp được thả)
          const overCardIndex = overColumn?.cards?.findIndex(card => card._id === overCardId)

          // logic tính toán "cardIndex mới" (trên hoặc dưới của overCard) lấy chuẩn ra từ code của thư viện
          let newCardIndex
          const isBelowOverItem = active.rect.current.translated &&
                active.rect.current.translated.top > over.rect.top + over.rect.height
          const modifier = isBelowOverItem ? 1 : 0

          newCardIndex = overCardIndex >= 0 ? overCardIndex + modifier : overColumn?.cards?.length + 1

          // clone mảng orderedColumns state cũ ra một cái mới để xử lý data rồi return - cập nhật lại orderedColumns state mới
          const nextColumns = cloneDeep(preColumns)
          const nextActiveColumn = nextColumns.find(column => column._id === activeColumn._id)
          const nextOverColumn = nextColumns.find(column => column._id === overColumn._id)

          // nextActiveColumn: column cũ
          if (nextActiveColumn) {
            // xóa card ở cái column active (cũng có thể hiểu là cái column cũ, cái lúc mà kéo card ra khỏi nó để sang columnn khác)
            nextActiveColumn.cards = nextActiveColumn.cards.filter(card => card._id !== activeDraggingCardId)

            // cập nhật lại mảng cardOrderIds cho chuẩn dữ liệu
            nextActiveColumn.cardOrderIds = nextActiveColumn.cards.map(card => card._id)
          }

          // nextOverColumn: Column mới
          if (nextOverColumn) {
            // kiểm tra xem card đang kéo nó có tồn tại ở overColumn chưa, nếu có thì cần xóa nó trước
            nextOverColumn.cards = nextOverColumn.cards.filter(card => card._id !== activeDraggingCardId)

            //Phải cập nhật lại chuẩn dữ liệu columnId trong card sau khi kéo card giữa 2 column khác nhau
            const rebuild_activeDraggingCardData = {
              ...activeDraggingCardData,
              columnId: nextOverColumn._id
            }

            // tiếp theo là thêm cái card đang kéo vào overColumn theo vị trí index mới
            nextOverColumn.cards = nextOverColumn.cards.toSpliced(newCardIndex, 0, rebuild_activeDraggingCardData)
            // cập nhật lại mảng cardOrderIds cho chuẩn dữ liệu
            nextOverColumn.cardOrderIds = nextOverColumn.cards.map(card => card._id)
          }
          return nextColumns
        })
      } else {
        // hành động kéo thả card trong cùng 1 cái column
        //lấy vị trí cũ - oldColumnWhenDraggingCard
        const oldCardIndex = oldColumnWhenDraggingCard?.cards?.findIndex(c => c._id === activeDragItemId)

        // lấy vị trí mới - over
        const newCardIndex = overColumn?.cards?.findIndex(c => c._id === overCardId)

        // kéo card trong cùng 1 column thì tương tự kéo thả column
        const dndOrderedCards = arrayMove(oldColumnWhenDraggingCard?.cards, oldCardIndex, newCardIndex)

        setOreredColumns(preColumns => {
          // clone mảng orderedColumns state cũ ra một cái mới để xử lý data rồi return - cập nhật lại orderedColumns state mới
          const nextColumns = cloneDeep(preColumns)

          // tìm tới cái column mà chúng ta đang thả
          const targetColumn = nextColumns.find(column => column._id === overColumn._id)

          // cập nhật lại 2 giá trị mới là cards và cardOrderIds trong cái targetColumn
          targetColumn.cards = dndOrderedCards
          targetColumn.cardOrderIds = dndOrderedCards.map(card => card._id)

          // trả về giá trị state mới
          return nextColumns
        })
      }
    }

    // Xử lý kéo thả Columns trong 1 cái boardContent
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
      //nếu vị trí kéo thả khác với vị trí ban đầu
      if (active.id !== over.id) {
        //lấy vị trí cũ - active
        const oldColumnIndex = orderedColumns.findIndex(c => c._id === active.id)

        // lấy vị trí mới - over
        const newColumnIndex = orderedColumns.findIndex(c => c._id === over.id)

        // code của arrayMove ở đây: dnd-kit/packages/sortable/src/utilities/arrayMove.ts
        const dndOrderedColumns = arrayMove(orderedColumns, oldColumnIndex, newColumnIndex)
        // const dndOrderedColumnnIds = dndOrderedColumns.map(c => c._id)
        // 2 consolog này để xử lý gọi API
        // console.log('dndOrderedColumns', dndOrderedColumns)
        // console.log('dndOrderedColumnnIds', dndOrderedColumnnIds)

        //cập nhật lại sau khi kéo thả
        setOreredColumns(dndOrderedColumns)
      }
    }

    setActiveDragItemId(null)
    setActiveDragItemType(null)
    setActiveDragItemData(null)
    setOldColumnWhenDraggingCard(null)
  }


  const customDropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5'
        }
      }
    })
  }

  // custom lại để phát hiện va chạm
  // bản chất của collisionDetectionStrategy là trả về MẢNG
  const collisionDetectionStrategy = useCallback((args) => {
    if ( activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN ) {
      return closestCorners({ ...args })
    }

    // tìm các điểm giao nhau, va chạm - intersections với con trỏ
    const pointerIntersections = pointerWithin(args)

    // nếu pointerIntersections là mảng rỗng thì return luôn ko làm gì
    // dòng này để fix bug khi kéo 1 card có image cover khi kéo lên trên cùng ra khỏi khu vực kéo thả
    if (!pointerIntersections?.length) return

    // thuật toán phát hiện va chạm sẽ trả về một mảng các va chạm ở đây
    // phát hiện va chạm: start -> over -> column -> card
    // const intersections = !!pointerIntersections.length ? pointerIntersections : rectIntersection(args)

    // getFirstCollision có 2 tham số, 1 là cái thuật toán phát hiện, 2 là id
    let overId = getFirstCollision(pointerIntersections, 'id')
    if (overId) {
      // nếu overId là cái column thì sẽ tìm tới cái cardId gần nhất bên trong khu vực đó dựa vào thuật toán phát hiện va chạm closestCenter hoặc closestCorners đều được. tuy nhiên ở đây dùng closestCorners mượt nhất
      const checkColumn = orderedColumns.find(column => column._id === overId)
      if (checkColumn) {
        overId = closestCorners({
          ...args,
          droppableContainers: args.droppableContainers.filter(container => {
            return (container.id !== overId) && (checkColumn?.cardOrderIds?.includes(container.id))
          })
        })[0]?.id
      }

      lastOverId.current = overId
      return [{ id: overId }]
    }
    // khi ở trong useCallback mà ta sử dụng state bên ngoài thì phải bỏ dô []
  }, [activeDragItemType, orderedColumns])


  return (
    <DndContext
      sensors={sensors}
      // closestCorners bị bug nên là sử dụng collisionDetectionStrategy
      // collisionDetection={closestCorners}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{
        backgroundColor: 'primary.main',
        width: '100%',
        height: (theme) => theme.trello.boardContentHeight,
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#324462' : '#2492D1'),
        padding: '10px 0'
      }}>

        <ListColumns columns={ orderedColumns }/>
        <DragOverlay dropAnimation={customDropAnimation}>
          {!activeDragItemType && null}
          {(activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN && <Column column={activeDragItemData}/>)}
          {(activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD && <Card card={activeDragItemData}/>)}
        </DragOverlay>
      </Box>
    </DndContext>
  )
}

export default BoardContent
