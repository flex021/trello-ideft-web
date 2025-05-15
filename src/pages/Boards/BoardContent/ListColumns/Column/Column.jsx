import { useState } from 'react'
import Box from '@mui/material/Box'
import { toast } from 'react-toastify'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import Tooltip from '@mui/material/Tooltip'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AddCardIcon from '@mui/icons-material/AddCard'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import Button from '@mui/material/Button'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import ListCards from './ListCards/ListCards'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TextField from '@mui/material/TextField'
import CloseIcon from '@mui/icons-material/Close'
import { useConfirm } from 'material-ui-confirm'
import {
  createNewCardAPI,
  updateColumnDetailsAPI
} from '~/apis/index.js'
import { cloneDeep } from 'lodash'
import { useDispatch, useSelector } from 'react-redux'
import {
  updateCurrentActiveBoard,
  selectCurrentActiveBoard
} from '~/redux/activeBoard/activeBoardSlice.js'
import {
  deleteColumnDetailsAPI
} from '~/apis/index.js'
import ToggleFocusInput from '~/components/Form/ToggleFocusInput'


function Column({ column }) {
  const dispatch = useDispatch()
  const board = useSelector(selectCurrentActiveBoard)

  const [openNewCardForm, setOpenNewCardForm] = useState(false)
  const toggleOpenNewCardForm = () => setOpenNewCardForm(!openNewCardForm)
  const [newCardTitle, setNewCardTitle] = useState('')

  const addNewCard = async () => {
    if (!newCardTitle) {
      toast.error('Please enter Card Title!', { position: 'top-left' } )
      return
    }

    const newCardData = {
      title: newCardTitle,
      columnId: column._id
    }

    const createCard = await createNewCardAPI({
      ...newCardData,
      boardId: board._id
    })
    const newBoard = cloneDeep(board)
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

    dispatch(updateCurrentActiveBoard(newBoard))

    toggleOpenNewCardForm()
    setNewCardTitle('')
  }

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column._id,
    data: { ...column }
  })

  const dndKitColumnStyle = {
    transform: CSS.Translate.toString(transform),
    transition,
    height: '100%',
    opacity: isDragging ? 0.5 : undefined
  }

  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  const orderedCards = column.cards

  const confirmDeleteColumn = useConfirm()
  const handleDeleteColumn = () => {
    confirmDeleteColumn({
      title: 'Delete Column?',
      description: 'Are you sure you want to delete this Column?',
      confirmationText: 'Confirm',
      cancellationText: 'Cancel'
    }).then(() => {
      const newBoard = cloneDeep(board)
      newBoard.columns = newBoard.columns.filter(c => c._id !== column._id)
      newBoard.columnOrderIds = newBoard.columnOrderIds.filter(_id => _id !== column._id)
      dispatch(updateCurrentActiveBoard(newBoard))
      deleteColumnDetailsAPI(column._id).then(res => {
        toast.success(res?.deleteResult)
      })
    }).catch(() => {})
  }

  const onUpdateColumnTitle = (newTitle) => {
    updateColumnDetailsAPI(column._id, { title: newTitle }).then(() => {
      const newBoard = cloneDeep(board)
      const columnToUpdate = newBoard.columns.find(c => c._id === column._id)
      if ( columnToUpdate ) columnToUpdate.title = newTitle
      dispatch(updateCurrentActiveBoard(newBoard))
    })

  }

  return (
    <div
      ref={setNodeRef}
      style={dndKitColumnStyle}
      {...attributes}
    >
      <Box
        {...listeners}
        sx={{
          minWidth: '300px',
          maxWidth: '300px',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#333643' : '#ebecf0'),
          ml: 2,
          borderRadius: '6px',
          height: 'fit-content',
          maxHeight: (theme) => `calc(${theme.trello.boardContentHeight} - ${theme.spacing(5)})`
        }}
      >
        {/* box clolumn header */}
        <Box sx={{
          height: (theme) => theme.trello.columnHeaderHeight,
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <ToggleFocusInput
            value={column?.title}
            onChangedValue={onUpdateColumnTitle}
            data-no-dnd="true"
          />
          <Box>
            <Tooltip title='More options'>
              <MoreHorizIcon
                id="basic-button-dropdown"
                aria-controls={open ? 'basic-menu-dropdown' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClick}
                sx={{
                  color: 'text.primary',
                  cursor: 'pointer'
                }}
              />
            </Tooltip>
            <Menu
              id="basic-menu-dropdown"
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              onClick={handleClose}
              MenuListProps={{
                'aria-labelledby': 'basic-button'
              }}
            >
              <MenuItem
                onClick={toggleOpenNewCardForm}
                sx={{
                  '&:hover': { color: 'success.light', '& .add-icon':{ color: 'success.light' } } }} fontSize="small">
                <ListItemIcon>
                  <AddCardIcon className='add-icon'/>
                </ListItemIcon>
                <ListItemText>Add card</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <ContentCopyIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Copy list</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={handleDeleteColumn}
                sx={{
                  '&:hover': { color: 'warning.dark', '& .delete-icon':{ color: 'warning.dark' } } }}
              >
                <ListItemIcon>
                  <DeleteForeverIcon className='delete-icon' fontSize="small" />
                </ListItemIcon>
                <ListItemText>Delete this column</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* box list card*/}
        <ListCards cards={ orderedCards }/>
        {/* box footer */}
        <Box sx={{
          height: (theme) => theme.trello.columnFooterHeight,
          padding: 2
        }}>
          {!openNewCardForm
            ? <Box sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Button startIcon={<AddCardIcon />} onClick={toggleOpenNewCardForm}>Add new card</Button>
              < DragHandleIcon />
            </Box>
            : <Box sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <TextField
                id="outlined-search"
                label="Enter column title..."
                size='small'
                variant="outlined"
                data-no-dnd="true"
                autoFocus
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                type="text"
                sx={{
                  '& label': { color: 'text.primary' },
                  '& input': {
                    color: (theme) => theme.palette.primary.main,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? '#333643' : 'white'
                  },
                  '& label.Mui-focused': { color: (theme) => theme.palette.primary.main },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: (theme) => theme.palette.primary.main },
                    '&:hover fieldset': { borderColor: (theme) => theme.palette.primary.main },
                    '&.Mui-focused fieldset': { borderColor: (theme) => theme.palette.primary.main }
                  },
                  '& .MuiOutlinedInput': {
                    borderRadius: 1
                  }
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  className="interceptor-loading"
                  onClick={addNewCard}
                  variant='contained'
                  data-no-dnd="true"
                  color='success'
                  size='small'
                  sx={{
                    boxShadow: 'none',
                    border: '0.5px solid',
                    borderColor: (theme) => theme.palette.success.main,
                    '&:hover': { bgcolor: (theme) => theme.palette.success.main }
                  }}
                >Add</Button>
                < CloseIcon
                  data-no-dnd="true"
                  fontSize='small'
                  sx={{
                    color: (theme) => theme.palette.warning.light,
                    cursor: 'pointer'
                  }}
                  onClick={toggleOpenNewCardForm}
                />
              </Box>
            </Box>
          }

        </Box>
      </Box>
    </div>
  )
}

export default Column
